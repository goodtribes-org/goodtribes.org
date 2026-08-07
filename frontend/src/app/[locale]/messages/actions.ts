"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getProjectRole, isLeadRole } from "@/lib/authz";
import { getRoomAccess } from "@/lib/roomAuth";
import { publishToRoom, publishToUser } from "@/lib/redis";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { triggerAiThreadReply } from "@/lib/aiThreadReply";
import { guardSocialAction } from "@/lib/socialActionGuard";
import { runProactiveModeration } from "@/lib/proactiveModeration";
import { indexMessage, deleteDocument, searchMessages } from "@/lib/meili";
import {
  findOrCreateDmRoom,
  createGroupRoom,
  markRoomRead as markRoomReadDb,
  getRoomMentionables,
  getNotificationRecipients,
  getPublicProjectChannelsBySlug,
  getPublicProjectChannelsForRoom,
  getSearchableRoomIds,
  type PublicProjectChannelGroup,
} from "@/lib/rooms";
import type { Room, RoomPostingPolicy } from "@prisma/client";

function assertValidBody(body: string, hasAttachments = false) {
  const stripped = body.replace(/<[^>]*>/g, "").trim();
  if ((!stripped && !hasAttachments) || body.length > 10_000) throw new Error("Invalid message");
}

// Mention nodes are serialized by RichTextEditor's Mention extension as
// <span data-type="mention" data-id="...">@Name</span>. Extracted IDs are
// never trusted as-is — the caller must intersect them with the room's
// actual mentionable users before notifying anyone.
function extractMentionedUserIds(body: string): string[] {
  const ids = new Set<string>();
  const re = /<span[^>]*data-type="mention"[^>]*>/g;
  const idRe = /data-id="([^"]+)"/;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body))) {
    const idMatch = idRe.exec(match[0]);
    if (idMatch) ids.add(idMatch[1]);
  }
  return [...ids];
}

function buildNotificationCopy(room: Room, senderName: string, body: string, isThread: boolean) {
  const preview = body.replace(/<[^>]*>/g, "").trim();
  const trimmed = preview.length > 120 ? `${preview.slice(0, 120)}…` : preview;

  if (room.type === "DM") {
    return { title: `Nytt meddelande från ${senderName}`, body: trimmed };
  }
  if (room.type === "GROUP") {
    return { title: `Nytt meddelande i ${room.name ?? "gruppen"}`, body: `${senderName}: ${trimmed}` };
  }
  const label = room.name ? `#${room.name}` : room.type === "ORG_CHANNEL" ? "arbetsrummet" : "kanalen";
  return {
    title: isThread ? `Nytt svar i tråd i ${label}` : `Nytt meddelande i ${label}`,
    body: `${senderName} skrev ett meddelande`,
  };
}

export async function sendRoomMessage(
  roomId: string,
  body: string,
  threadParentId?: string,
  attachmentFileIds?: string[]
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const access = await getRoomAccess(roomId, userId);
  if (!access?.canPost) throw new Error("Forbidden");
  assertValidBody(body, (attachmentFileIds?.length ?? 0) > 0);

  const guard = await guardSocialAction(userId, "message");
  if (!guard.ok) throw new Error(guard.error);

  const message = await prisma.message.create({
    data: { roomId, authorId: userId, body, threadParentId },
    include: {
      author: { select: { id: true, name: true, image: true } },
      reactions: { select: { emoji: true, userId: true } },
      _count: { select: { threadReplies: true } },
    },
  });

  let attachments: { id: string; key: string; name: string; mimeType: string; size: number }[] = [];
  if (attachmentFileIds?.length) {
    // ownerId + messageId:null guards against attaching someone else's file,
    // or re-attaching a file that's already linked to a different message.
    await prisma.file.updateMany({
      where: { id: { in: attachmentFileIds }, ownerId: userId, messageId: null },
      data: { messageId: message.id },
    });
    attachments = await prisma.file.findMany({
      where: { messageId: message.id },
      select: { id: true, key: true, name: true, mimeType: true, size: true },
    });
  }
  const messageWithAttachments = { ...message, attachments };

  void indexMessage({
    id: message.id,
    roomId,
    body: body.replace(/<[^>]*>/g, "").trim(),
    authorName: session.user.name ?? "Någon",
    createdAt: Math.floor(message.createdAt.getTime() / 1000),
  });

  await runProactiveModeration({
    targetType: "Message",
    targetId: message.id,
    authorId: userId,
    text: body.replace(/<[^>]*>/g, ""),
    url: `/messages/${roomId}`,
  });

  await prisma.room.update({ where: { id: roomId }, data: { lastMessageAt: new Date() } });

  // Lazily create/refresh the sender's own roster row for channel types so
  // they never see their own just-sent message flagged unread. Open
  // IDEA_THREAD rooms (Idéverkstaden, no project) have no external
  // membership source — RoomParticipant is the only roster, so the first
  // post from a new participant registers them here too.
  const isOpenIdeaThread = access.room.type === "IDEA_THREAD" && !access.room.projectId;
  if (access.room.type === "PROJECT_CHANNEL" || access.room.type === "ORG_CHANNEL" || isOpenIdeaThread) {
    await markRoomReadDb(roomId, userId);
  }

  publishToRoom(roomId, { type: "created", message: messageWithAttachments });

  const senderName = session.user.name ?? "Någon";
  const rawMentionIds = extractMentionedUserIds(body);
  let mentionedIds: string[] = [];
  if (rawMentionIds.length > 0) {
    const mentionables = await getRoomMentionables(access.room, userId);
    const validIds = new Set(mentionables.map((u) => u.id));
    mentionedIds = rawMentionIds.filter((id) => validIds.has(id));
  }

  if (access.room.type === "IDEA_THREAD" && mentionedIds.length > 0) {
    const aiUser = await getAiParticipantUser();
    if (mentionedIds.includes(aiUser.id)) {
      // Fire-and-forget: the triggering message is already saved/published
      // above, the AI's reply arrives moments later over the same SSE
      // channel. Safe because this app runs as a persistent Node server,
      // not a serverless function that tears down after the response.
      void triggerAiThreadReply(access.room);
    }
  }

  // Deep-links straight to the message that triggered the notification —
  // ?m opens/scrolls to it, ?thread additionally opens the right thread
  // panel first since replies aren't visible in the main list at all.
  const messageUrl = threadParentId
    ? `/messages/${roomId}?thread=${threadParentId}&m=${message.id}`
    : `/messages/${roomId}?m=${message.id}`;

  const recipients = (await getNotificationRecipients(access.room, userId, threadParentId)).filter(
    (id) => !mentionedIds.includes(id)
  );
  if (recipients.length > 0) {
    const { title, body: notifBody } = buildNotificationCopy(access.room, senderName, body, !!threadParentId);
    const type = threadParentId ? "room_thread_reply" : "room_message";
    await prisma.notification
      .createMany({
        data: recipients.map((recipientId) => ({
          userId: recipientId,
          type,
          title,
          body: notifBody,
          url: messageUrl,
        })),
      })
      .catch(() => {});
    const createdAt = new Date().toISOString();
    for (const recipientId of recipients) {
      publishToUser(recipientId, {
        type: "notification",
        notification: { id: crypto.randomUUID(), type, title, body: notifBody, url: messageUrl, read: false, createdAt },
      });
    }
  }

  if (mentionedIds.length > 0) {
    const preview = body.replace(/<[^>]*>/g, "").trim();
    const trimmed = preview.length > 120 ? `${preview.slice(0, 120)}…` : preview;
    const title = `${senderName} nämnde dig`;
    await prisma.notification
      .createMany({
        data: mentionedIds.map((recipientId) => ({
          userId: recipientId,
          type: "room_mention",
          title,
          body: trimmed,
          url: messageUrl,
        })),
      })
      .catch(() => {});
    const createdAt = new Date().toISOString();
    for (const recipientId of mentionedIds) {
      publishToUser(recipientId, {
        type: "notification",
        notification: { id: crypto.randomUUID(), type: "room_mention", title, body: trimmed, url: messageUrl, read: false, createdAt },
      });
    }
  }

  for (const id of new Set([...recipients, ...mentionedIds])) {
    publishToUser(id, { type: "room-message", roomId });
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${roomId}`);
  revalidatePath("/feed");

  return messageWithAttachments;
}

// Ephemeral, DB-free signal — mirrors the sprint canvas broadcast pattern in
// redis.ts. A throttled call from the composer on every keystroke would be
// wasteful, so the client only calls this at most once every couple of
// seconds; expiry (and thus "stopped typing") is handled client-side via a
// timeout on the receiving end, not by a second signal from here.
export async function sendTypingSignal(roomId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  const access = await getRoomAccess(roomId, session.user.id);
  if (!access?.canPost) return;

  publishToRoom(roomId, { type: "typing", userId: session.user.id, name: session.user.name ?? "Någon" });
}

export async function startDirectMessage(recipientUserId: string, firstMessage: string): Promise<{ roomId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const roomId = await findOrCreateDmRoom(session.user.id, recipientUserId);
  await sendRoomMessage(roomId, firstMessage);
  return { roomId };
}

// Opens (or creates) a DM room without requiring a first message, for
// starting a conversation directly from the messages sidebar — the room
// is empty until the user actually sends something from the composer.
export async function openDirectMessage(recipientUserId: string): Promise<{ roomId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const roomId = await findOrCreateDmRoom(session.user.id, recipientUserId);
  revalidatePath("/messages");
  return { roomId };
}

export async function searchUsersForDm(query: string): Promise<{ id: string; name: string | null; image: string | null }[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const trimmed = query.trim();
  if (!trimmed) return [];

  return prisma.user.findMany({
    where: {
      id: { not: session.user.id },
      showProfile: true,
      name: { contains: trimmed, mode: "insensitive" },
    },
    select: { id: true, name: true, image: true },
    take: 8,
    orderBy: { name: "asc" },
  });
}

export async function createGroupChat(
  memberIds: string[],
  name?: string,
  firstMessage?: string
): Promise<{ roomId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (memberIds.length === 0) throw new Error("A group needs at least one other member");

  const roomId = await createGroupRoom(session.user.id, memberIds, name);
  if (firstMessage?.trim()) {
    await sendRoomMessage(roomId, firstMessage.trim());
  }
  revalidatePath("/messages");
  return { roomId };
}

export async function createChannelRoom(params: {
  projectId?: string;
  organisationId?: string;
  name: string;
  description?: string;
  postingPolicy?: RoomPostingPolicy;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  if (params.projectId) {
    const role = await getProjectRole(params.projectId, userId);
    if (!(role && isLeadRole(role))) throw new Error("Only admins can create channels");
  } else if (params.organisationId) {
    const [member, org] = await Promise.all([
      prisma.organisationMember.findUnique({
        where: { organisationId_userId: { organisationId: params.organisationId, userId } },
      }),
      prisma.organisation.findUnique({ where: { id: params.organisationId }, select: { ownerId: true } }),
    ]);
    const isLead = org?.ownerId === userId || member?.role === "ADMIN";
    if (!isLead) throw new Error("Only admins can create channels");
  } else {
    throw new Error("Channel must belong to a project or organisation");
  }

  const safeName = params.name
    .trim()
    .toLowerCase()
    .replace(/[^a-zåäö0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  if (!safeName) throw new Error("Invalid channel name");

  const maxOrder = await prisma.room.aggregate({
    where: { projectId: params.projectId, organisationId: params.organisationId },
    _max: { order: true },
  });

  const room = await prisma.room.create({
    data: {
      type: params.projectId ? "PROJECT_CHANNEL" : "ORG_CHANNEL",
      projectId: params.projectId,
      organisationId: params.organisationId,
      name: safeName,
      description: params.description,
      postingPolicy: params.postingPolicy ?? "ALL_MEMBERS",
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });

  revalidatePath("/messages");
  return room;
}

export async function toggleReaction(messageId: string, roomId: string, emoji: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const access = await getRoomAccess(roomId, session.user.id);
  if (!access?.canRead) throw new Error("Forbidden");

  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId: session.user.id, emoji } },
  });

  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.messageReaction.create({ data: { messageId, userId: session.user.id, emoji } });
  }

  revalidatePath(`/messages/${roomId}`);
  revalidatePath("/feed");
}

// Only the original author may edit their own message, and only while it
// hasn't been soft-deleted. Deletion is modeled as an "update" too (deletedAt
// set, body cleared) so the client can reuse the same SSE event type — see
// publishToRoom below.
export async function editRoomMessage(roomId: string, messageId: string, body: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  assertValidBody(body);

  const existing = await prisma.message.findUnique({ where: { id: messageId } });
  if (!existing || existing.roomId !== roomId) throw new Error("Not found");
  if (existing.authorId !== session.user.id) throw new Error("Forbidden");
  if (existing.deletedAt) throw new Error("Message deleted");

  const message = await prisma.message.update({
    where: { id: messageId },
    data: { body, editedAt: new Date() },
    include: {
      author: { select: { id: true, name: true, image: true } },
      reactions: { select: { emoji: true, userId: true } },
      attachments: { select: { id: true, key: true, name: true, mimeType: true, size: true } },
      _count: { select: { threadReplies: true } },
    },
  });

  void indexMessage({
    id: message.id,
    roomId,
    body: body.replace(/<[^>]*>/g, "").trim(),
    authorName: message.author.name ?? "Någon",
    createdAt: Math.floor(message.createdAt.getTime() / 1000),
  });

  publishToRoom(roomId, { type: "updated", message });
  revalidatePath(`/messages/${roomId}`);
}

export async function deleteRoomMessage(roomId: string, messageId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.message.findUnique({ where: { id: messageId } });
  if (!existing || existing.roomId !== roomId) throw new Error("Not found");
  if (existing.authorId !== session.user.id) throw new Error("Forbidden");

  const message = await prisma.message.update({
    where: { id: messageId },
    data: { body: "", deletedAt: new Date() },
    include: {
      author: { select: { id: true, name: true, image: true } },
      reactions: { select: { emoji: true, userId: true } },
      attachments: { select: { id: true, key: true, name: true, mimeType: true, size: true } },
      _count: { select: { threadReplies: true } },
    },
  });

  void deleteDocument("messages", messageId);

  publishToRoom(roomId, { type: "updated", message });
  revalidatePath(`/messages/${roomId}`);
}

// No auth required — used by the sidebar to let a logged-out (or
// logged-in-but-not-a-member) visitor discover a public project's channels
// when they land on one directly, since their personal channel list
// (getProjectChannelGroups) wouldn't otherwise include it.
export async function getPublicProjectChannels(
  by: { slug: string } | { roomId: string }
): Promise<PublicProjectChannelGroup | null> {
  return "slug" in by ? getPublicProjectChannelsBySlug(by.slug) : getPublicProjectChannelsForRoom(by.roomId);
}

export async function markRoomRead(roomId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  const lastReadAt = await markRoomReadDb(roomId, session.user.id);
  publishToRoom(roomId, { type: "read", userId: session.user.id, lastReadAt: lastReadAt.toISOString() });
  revalidatePath("/messages");
}

// roomId scopes to "search within this room" (access re-checked live, same
// as opening the room itself); omitted, it searches every room the caller
// currently belongs to (see getSearchableRoomIds — computed fresh per call,
// never cached, so losing access to a room stops surfacing it immediately).
export async function searchRoomMessages(
  query: string,
  roomId?: string
): Promise<{ id: string; roomId: string; body: string; authorName: string; createdAt: number }[]> {
  const session = await auth();
  if (!session?.user?.id || query.trim().length < 2) return [];

  let roomIds: string[];
  if (roomId) {
    const access = await getRoomAccess(roomId, session.user.id);
    if (!access?.canRead) return [];
    roomIds = [roomId];
  } else {
    roomIds = await getSearchableRoomIds(session.user.id);
    if (roomIds.length === 0) return [];
  }

  return searchMessages(query, roomIds);
}

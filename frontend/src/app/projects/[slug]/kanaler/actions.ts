"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notify";

async function getMemberRole(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
  return member?.role ?? null;
}

export async function sendMessage(channelId: string, projectSlug: string, body: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found");

  const role = await getMemberRole(project.id, session.user.id);
  if (!role) throw new Error("Not a member");

  const stripped = body.replace(/<[^>]*>/g, "").trim();
  if (!stripped || body.length > 10_000) throw new Error("Invalid message");

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { name: true, type: true },
  });
  if (!channel) throw new Error("Channel not found");

  if (channel.type === "announcement" && role !== "owner" && role !== "admin") {
    throw new Error("Only admins can post in announcement channels");
  }

  await prisma.channelMessage.create({
    data: { channelId, authorId: session.user.id, body },
  });

  // Notify all other project members
  const members = await prisma.projectMember.findMany({
    where: { projectId: project.id, userId: { not: session.user.id } },
    select: { userId: true },
  });
  const senderName = session.user.name ?? "Någon";
  await Promise.allSettled(
    members.map((m) =>
      createNotification({
        userId: m.userId,
        type: "channel_message",
        title: `Nytt meddelande i #${channel.name}`,
        body: `${senderName} skrev ett meddelande`,
        url: `/projects/${projectSlug}/kanaler/${channelId}`,
      })
    )
  );
}

export async function sendThreadReply(
  channelId: string,
  threadParentId: string,
  projectSlug: string,
  body: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found");

  const role = await getMemberRole(project.id, session.user.id);
  if (!role) throw new Error("Not a member");

  const stripped = body.replace(/<[^>]*>/g, "").trim();
  if (!stripped || body.length > 10_000) throw new Error("Invalid message");

  await prisma.channelMessage.create({
    data: { channelId, authorId: session.user.id, body, threadParentId },
  });

  // Notify thread participants
  const parentMsg = await prisma.channelMessage.findUnique({
    where: { id: threadParentId },
    select: { authorId: true },
  });
  const existingReplies = await prisma.channelMessage.findMany({
    where: { threadParentId },
    select: { authorId: true },
    distinct: ["authorId"],
  });
  const recipientIds = [
    ...new Set([
      parentMsg?.authorId,
      ...existingReplies.map((r) => r.authorId),
    ].filter((id): id is string => !!id && id !== session.user.id)),
  ];

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { name: true },
  });
  const senderName = session.user.name ?? "Någon";
  await Promise.allSettled(
    recipientIds.map((userId) =>
      createNotification({
        userId,
        type: "channel_message",
        title: `Nytt svar i tråd i #${channel?.name ?? "kanalen"}`,
        body: `${senderName} svarade i en tråd`,
        url: `/projects/${projectSlug}/kanaler/${channelId}`,
      })
    )
  );
}

export async function toggleReaction(
  messageId: string,
  channelId: string,
  projectSlug: string,
  emoji: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.channelMessageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId: session.user.id, emoji } },
  });

  if (existing) {
    await prisma.channelMessageReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.channelMessageReaction.create({
      data: { messageId, userId: session.user.id, emoji },
    });
  }
}

export async function createChannel(
  projectId: string,
  projectSlug: string,
  name: string,
  description?: string,
  type?: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const role = await getMemberRole(projectId, session.user.id);
  if (role !== "owner" && role !== "admin") throw new Error("Only admins can create channels");

  const safeName = name.trim().toLowerCase().replace(/[^a-zåäö0-9-]/g, "-").replace(/-+/g, "-").slice(0, 40);
  if (!safeName) throw new Error("Invalid channel name");

  const maxOrder = await prisma.channel.aggregate({
    where: { projectId },
    _max: { order: true },
  });
  const order = (maxOrder._max.order ?? 0) + 1;

  const channel = await prisma.channel.create({
    data: { projectId, name: safeName, description, type: type ?? "text", order },
  });

  revalidatePath(`/projects/${projectSlug}/kanaler`);
  return channel;
}

export async function markChannelRead(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.channelReadMarker.upsert({
    where: { channelId_userId: { channelId, userId: session.user.id } },
    create: { channelId, userId: session.user.id, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });
}

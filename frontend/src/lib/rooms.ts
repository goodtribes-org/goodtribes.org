import { prisma } from "@/lib/prisma";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import type { Room } from "@prisma/client";

export async function findOrCreateDmRoom(userIdA: string, userIdB: string): Promise<string> {
  if (userIdA === userIdB) throw new Error("Cannot message yourself");

  const pairKey = [userIdA, userIdB].sort().join("_");
  const room = await prisma.room.upsert({
    where: { pairKey },
    create: {
      type: "DM",
      pairKey,
      participants: { create: [{ userId: userIdA }, { userId: userIdB }] },
    },
    update: {},
  });
  return room.id;
}

export async function createGroupRoom(creatorId: string, memberIds: string[], name?: string): Promise<string> {
  const room = await prisma.room.create({
    data: {
      type: "GROUP",
      name: name?.trim() || null,
      participants: {
        create: [
          { userId: creatorId, role: "OWNER" },
          ...memberIds.filter((id) => id !== creatorId).map((userId) => ({ userId, role: "MEMBER" as const })),
        ],
      },
    },
  });
  return room.id;
}

// Marks a room read for a user, creating the RoomParticipant roster row if it
// doesn't exist yet (project/org channel rows are lazily created on first
// read, mirroring the old ChannelReadMarker's create-on-first-mark behavior).
export async function markRoomRead(roomId: string, userId: string) {
  await prisma.roomParticipant.upsert({
    where: { roomId_userId: { roomId, userId } },
    create: { roomId, userId, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });
}

export async function isRoomUnread(roomId: string, userId: string, lastReadAt: Date): Promise<boolean> {
  const unread = await prisma.message.findFirst({
    where: { roomId, authorId: { not: userId }, createdAt: { gt: lastReadAt } },
    select: { id: true },
  });
  return !!unread;
}

const EPOCH = new Date(0);

export async function getUnreadRoomCount(userId: string): Promise<number> {
  const [dmGroupParticipations, projectRooms, orgRooms] = await Promise.all([
    prisma.roomParticipant.findMany({
      where: { userId, room: { type: { in: ["DM", "GROUP"] } } },
      select: { roomId: true, lastReadAt: true },
    }),
    prisma.room.findMany({
      where: { type: "PROJECT_CHANNEL", project: { members: { some: { userId, role: { not: "FOLLOWER" } } } } },
      select: { id: true },
    }),
    prisma.room.findMany({
      where: { type: "ORG_CHANNEL", organisation: { OR: [{ members: { some: { userId } } }, { ownerId: userId }] } },
      select: { id: true },
    }),
  ]);

  const channelRoomIds = [...projectRooms, ...orgRooms].map((r) => r.id);
  const readMarkers = channelRoomIds.length
    ? await prisma.roomParticipant.findMany({
        where: { userId, roomId: { in: channelRoomIds } },
        select: { roomId: true, lastReadAt: true },
      })
    : [];
  const markerByRoom = new Map(readMarkers.map((m) => [m.roomId, m.lastReadAt]));

  const [dmGroupUnread, channelUnread] = await Promise.all([
    Promise.all(dmGroupParticipations.map((p) => isRoomUnread(p.roomId, userId, p.lastReadAt))),
    Promise.all(channelRoomIds.map((roomId) => isRoomUnread(roomId, userId, markerByRoom.get(roomId) ?? EPOCH))),
  ]);

  return [...dmGroupUnread, ...channelUnread].filter(Boolean).length;
}

export async function getProjectChannelGroups(userId: string) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId, role: { not: "FOLLOWER" } },
    select: {
      project: {
        select: {
          id: true,
          slug: true,
          title: true,
          rooms: { where: { type: "PROJECT_CHANNEL" }, orderBy: { order: "asc" }, select: { id: true, name: true } },
        },
      },
    },
  });
  return memberships.map((m) => m.project).filter((p) => p.rooms.length > 0);
}

export type PublicProjectChannelGroup = {
  id: string;
  slug: string;
  title: string;
  rooms: { id: string; name: string | null }[];
};

// Membership-independent counterpart to getProjectChannelGroups — lists a
// single public project's channels so the messages sidebar can surface them
// to a logged-out (or logged-in-but-not-a-member) visitor who lands on that
// project's channel via a direct link (e.g. from the activity feed) or the
// project page's "Kommunikation" tab. Private projects return null: their
// channels stay discoverable only to members, same as getRoomAccess.
export async function getPublicProjectChannelsBySlug(slug: string): Promise<PublicProjectChannelGroup | null> {
  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, title: true, visibility: true,
      rooms: { where: { type: "PROJECT_CHANNEL" }, orderBy: { order: "asc" }, select: { id: true, name: true } },
    },
  });
  if (!project || project.visibility !== "public" || project.rooms.length === 0) return null;
  return { id: project.id, slug: project.slug, title: project.title, rooms: project.rooms };
}

export async function getPublicProjectChannelsForRoom(roomId: string): Promise<PublicProjectChannelGroup | null> {
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { type: true, projectId: true } });
  if (!room || room.type !== "PROJECT_CHANNEL" || !room.projectId) return null;
  const project = await prisma.project.findUnique({ where: { id: room.projectId }, select: { slug: true } });
  if (!project) return null;
  return getPublicProjectChannelsBySlug(project.slug);
}

export async function getOrgChannelGroups(userId: string) {
  const [memberships, ownedOrgs] = await Promise.all([
    prisma.organisationMember.findMany({
      where: { userId },
      select: {
        organisation: {
          select: {
            id: true,
            slug: true,
            name: true,
            rooms: { where: { type: "ORG_CHANNEL" }, select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.organisation.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        slug: true,
        name: true,
        rooms: { where: { type: "ORG_CHANNEL" }, select: { id: true, name: true } },
      },
    }),
  ]);

  const byId = new Map<string, { id: string; slug: string; name: string; rooms: { id: string; name: string | null }[] }>();
  memberships.forEach((m) => byId.set(m.organisation.id, m.organisation));
  ownedOrgs.forEach((o) => byId.set(o.id, o));
  return [...byId.values()].filter((o) => o.rooms.length > 0);
}

// Users that can be @mentioned in a room, sourced from the same membership
// records that drive notification fan-out (see getNotificationRecipients in
// messages/actions.ts): RoomParticipant for DM/GROUP, ProjectMember/
// OrganisationMember for channels.
export async function getRoomMentionables(room: Room, excludeUserId: string): Promise<{ id: string; name: string | null }[]> {
  if (room.type === "DM" || room.type === "GROUP") {
    const participants = await prisma.roomParticipant.findMany({
      where: { roomId: room.id, userId: { not: excludeUserId } },
      select: { user: { select: { id: true, name: true } } },
    });
    return participants.map((p) => p.user);
  }

  if (room.type === "PROJECT_CHANNEL" && room.projectId) {
    const members = await prisma.projectMember.findMany({
      where: { projectId: room.projectId, userId: { not: excludeUserId }, role: { not: "FOLLOWER" } },
      select: { user: { select: { id: true, name: true } } },
    });
    return members.map((m) => m.user);
  }

  if (room.type === "ORG_CHANNEL" && room.organisationId) {
    const [members, org] = await Promise.all([
      prisma.organisationMember.findMany({
        where: { organisationId: room.organisationId, userId: { not: excludeUserId } },
        select: { user: { select: { id: true, name: true } } },
      }),
      prisma.organisation.findUnique({
        where: { id: room.organisationId },
        select: { ownerId: true, owner: { select: { id: true, name: true } } },
      }),
    ]);
    const byId = new Map(members.map((m) => [m.user.id, m.user]));
    if (org && org.ownerId !== excludeUserId) byId.set(org.ownerId, org.owner);
    return [...byId.values()];
  }

  // IDEA_THREAD — Idéverkstaden. AI is always mentionable (PRD 5.10: anyone
  // in the thread can type `@AI` at any point), unlike person-mentions
  // which depend on who's already posted/is a project member.
  if (room.type === "IDEA_THREAD") {
    const aiUser = await getAiParticipantUser();
    const people = room.projectId
      ? await prisma.projectMember.findMany({
          where: { projectId: room.projectId, userId: { not: excludeUserId }, role: { not: "FOLLOWER" } },
          select: { user: { select: { id: true, name: true } } },
        }).then((rows) => rows.map((r) => r.user))
      : await prisma.roomParticipant.findMany({
          where: { roomId: room.id, userId: { not: excludeUserId } },
          select: { user: { select: { id: true, name: true } } },
        }).then((rows) => rows.map((r) => r.user));
    return [aiUser, ...people];
  }

  return [];
}

export async function getNotificationRecipients(room: Room, senderId: string, threadParentId?: string): Promise<string[]> {
  if (threadParentId) {
    const [parent, repliers] = await Promise.all([
      prisma.message.findUnique({ where: { id: threadParentId }, select: { authorId: true } }),
      prisma.message.findMany({ where: { threadParentId }, select: { authorId: true }, distinct: ["authorId"] }),
    ]);
    return [
      ...new Set(
        [parent?.authorId, ...repliers.map((r) => r.authorId)].filter(
          (id): id is string => !!id && id !== senderId
        )
      ),
    ];
  }

  if (room.type === "DM" || room.type === "GROUP") {
    const participants = await prisma.roomParticipant.findMany({
      where: { roomId: room.id, userId: { not: senderId } },
      select: { userId: true },
    });
    return participants.map((p) => p.userId);
  }

  if (room.type === "PROJECT_CHANNEL" && room.projectId) {
    const members = await prisma.projectMember.findMany({
      where: { projectId: room.projectId, userId: { not: senderId } },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  if (room.type === "ORG_CHANNEL" && room.organisationId) {
    const [members, org] = await Promise.all([
      prisma.organisationMember.findMany({
        where: { organisationId: room.organisationId, userId: { not: senderId } },
        select: { userId: true },
      }),
      prisma.organisation.findUnique({ where: { id: room.organisationId }, select: { ownerId: true } }),
    ]);
    const ids = new Set(members.map((m) => m.userId));
    if (org && org.ownerId !== senderId) ids.add(org.ownerId);
    return [...ids];
  }

  if (room.type === "IDEA_THREAD") {
    if (room.projectId) {
      const members = await prisma.projectMember.findMany({
        where: { projectId: room.projectId, userId: { not: senderId } },
        select: { userId: true },
      });
      return members.map((m) => m.userId);
    }
    const participants = await prisma.roomParticipant.findMany({
      where: { roomId: room.id, userId: { not: senderId } },
      select: { userId: true },
    });
    return participants.map((p) => p.userId);
  }

  return [];
}

export async function getDirectAndGroupRooms(userId: string) {
  const participations = await prisma.roomParticipant.findMany({
    where: { userId, room: { type: { in: ["DM", "GROUP"] } } },
    select: {
      lastReadAt: true,
      room: {
        select: {
          id: true,
          type: true,
          name: true,
          lastMessageAt: true,
          participants: {
            where: { userId: { not: userId } },
            select: { user: { select: { id: true, name: true, image: true } } },
          },
          messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, authorId: true } },
        },
      },
    },
    orderBy: { room: { lastMessageAt: "desc" } },
  });

  return Promise.all(
    participations.map(async (p) => ({
      id: p.room.id,
      type: p.room.type as "DM" | "GROUP",
      name: p.room.name,
      otherUsers: p.room.participants.map((rp) => rp.user),
      lastMessage: p.room.messages[0] ?? null,
      lastMessageAt: p.room.lastMessageAt,
      unread: await isRoomUnread(p.room.id, userId, p.lastReadAt),
    }))
  );
}

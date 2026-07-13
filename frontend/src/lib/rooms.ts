import { prisma } from "@/lib/prisma";

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

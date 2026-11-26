import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRoomAccess } from "@/lib/roomAuth";
import { markRoomRead } from "@/lib/rooms";
import { publishToRoom } from "@/lib/redis";
import { toProxyUrl } from "@/lib/storageUrl";

// One conversation for the panel: the latest messages (oldest first), whether
// you can post, and what the composer needs. Opening it marks it read — only
// for someone who can read the room, so this never creates a roster row for a
// room you have no business in. Same access rule as /messages/[roomId].
const TAKE = 40;

export async function GET(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId } = await params;
  const access = await getRoomAccess(roomId, userId);
  if (!access?.canRead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [latest, others, project, organisation] = await Promise.all([
    prisma.message.findMany({
      where: { roomId, threadParentId: null, hiddenAt: null, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: TAKE,
      select: { id: true, body: true, createdAt: true, author: { select: { id: true, name: true, image: true } } },
    }),
    access.room.type === "DM" || access.room.type === "GROUP"
      ? prisma.roomParticipant.findMany({ where: { roomId, userId: { not: userId } }, select: { user: { select: { name: true } } } })
      : Promise.resolve([]),
    access.room.projectId ? prisma.project.findUnique({ where: { id: access.room.projectId }, select: { title: true } }) : null,
    access.room.organisationId ? prisma.organisation.findUnique({ where: { id: access.room.organisationId }, select: { name: true } }) : null,
  ]);

  // Only rooms you belong to get a read marker (a public channel you merely
  // read keeps no roster row, same as before).
  const belongs = access.canPost || access.room.type === "DM" || access.room.type === "GROUP";
  if (belongs) {
    const lastReadAt = await markRoomRead(roomId, userId);
    publishToRoom(roomId, { type: "read", userId, lastReadAt: lastReadAt.toISOString() });
  }

  const room = access.room;
  const title =
    room.type === "DM" ? (others[0]?.user.name ?? "?")
    : room.type === "GROUP" ? (room.name ?? others.map((o) => o.user.name ?? "?").join(", "))
    : `#${room.name ?? "kanal"}`;

  return NextResponse.json({
    roomId,
    title,
    context: project?.title ?? organisation?.name ?? null,
    canPost: access.canPost,
    projectId: room.projectId,
    organisationId: room.organisationId,
    messages: latest.reverse().map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      mine: m.author?.id === userId,
      author: m.author ? { name: m.author.name, image: m.author.image ? toProxyUrl(m.author.image) : null } : null,
    })),
  });
}

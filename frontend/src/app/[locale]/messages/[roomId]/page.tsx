export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getRoomAccess } from "@/lib/roomAuth";
import { RoomShell } from "./RoomShell";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const access = await getRoomAccess(roomId, session.user.id);
  if (!access?.canRead) notFound();

  const [messages, otherUsers] = await Promise.all([
    prisma.message.findMany({
      where: { roomId, threadParentId: null },
      include: {
        author: { select: { id: true, name: true, image: true } },
        reactions: { select: { emoji: true, userId: true } },
        _count: { select: { threadReplies: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
    access.room.type === "DM" || access.room.type === "GROUP"
      ? prisma.roomParticipant.findMany({
          where: { roomId, userId: { not: session.user.id } },
          select: { user: { select: { id: true, name: true, image: true } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <RoomShell
      room={{
        id: access.room.id,
        type: access.room.type,
        name: access.room.name,
        postingPolicy: access.room.postingPolicy,
        otherUsers: otherUsers.map((p) => p.user),
      }}
      initialMessages={messages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      }))}
      currentUserId={session.user.id}
      canPost={access.canPost}
    />
  );
}

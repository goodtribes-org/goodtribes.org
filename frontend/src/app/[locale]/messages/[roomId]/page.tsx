export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getRoomAccess } from "@/lib/roomAuth";
import { getRoomMentionables } from "@/lib/rooms";
import { RoomShell } from "./RoomShell";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const access = await getRoomAccess(roomId, userId);
  if (!access) notFound();
  if (!access.canRead) {
    // DM/GROUP/ORG_CHANNEL and private-project channels stay fully gated —
    // prompt login for a logged-out visitor, 404 for a logged-in non-member
    // (same as visiting someone else's private content elsewhere in the app).
    if (!userId) redirect("/login");
    notFound();
  }

  const [messages, otherUsers, mentionables] = await Promise.all([
    prisma.message.findMany({
      where: { roomId, threadParentId: null, hiddenAt: null },
      include: {
        author: { select: { id: true, name: true, image: true } },
        reactions: { select: { emoji: true, userId: true } },
        _count: { select: { threadReplies: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
    (access.room.type === "DM" || access.room.type === "GROUP") && userId
      ? prisma.roomParticipant.findMany({
          where: { roomId, userId: { not: userId } },
          select: { user: { select: { id: true, name: true, image: true } } },
        })
      : Promise.resolve([]),
    userId ? getRoomMentionables(access.room, userId) : Promise.resolve([]),
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
      currentUserId={userId}
      canPost={!!userId && access.canPost}
      mentionables={mentionables}
    />
  );
}

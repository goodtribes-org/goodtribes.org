import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRoomAccess } from "@/lib/roomAuth";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string; threadParentId: string }> }
) {
  const { roomId, threadParentId } = await params;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  const access = await getRoomAccess(roomId, session.user.id);
  if (!access?.canRead) return NextResponse.json([], { status: 403 });

  const replies = await prisma.message.findMany({
    where: { roomId, threadParentId },
    include: {
      author: { select: { id: true, name: true, image: true } },
      reactions: { select: { emoji: true, userId: true } },
      _count: { select: { threadReplies: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(replies);
}

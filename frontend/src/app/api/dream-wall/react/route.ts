import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"


const ALLOWED_EMOJIS = ["❤️", "🙌", "🚀", "💡"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { dreamWallPostId, emoji } = body as {
    dreamWallPostId?: string;
    emoji?: string;
  };

  if (!dreamWallPostId || !emoji || !ALLOWED_EMOJIS.includes(emoji)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.dreamWallReaction.findUnique({
    where: {
      dreamWallPostId_userId_emoji: {
        dreamWallPostId,
        userId: session.user.id,
        emoji,
      },
    },
  });

  if (existing) {
    await prisma.dreamWallReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.dreamWallReaction.create({
      data: {
        dreamWallPostId,
        userId: session.user.id,
        emoji,
      },
    });
  }

  const reactions = await prisma.dreamWallReaction.findMany({
    where: { dreamWallPostId },
    select: { emoji: true, userId: true },
  });

  return NextResponse.json({ reactions });
}

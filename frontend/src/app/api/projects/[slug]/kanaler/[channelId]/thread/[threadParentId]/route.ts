import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ slug: string; channelId: string; threadParentId: string }>;
  }
) {
  const { slug, channelId, threadParentId } = await params;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!project) return NextResponse.json([], { status: 404 });

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: project.id, userId: session.user.id } },
  });
  if (!member) return NextResponse.json([], { status: 403 });

  const replies = await prisma.channelMessage.findMany({
    where: { channelId, threadParentId },
    include: {
      author: { select: { id: true, name: true, image: true } },
      reactions: { select: { emoji: true, userId: true } },
      _count: { select: { threadReplies: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(replies);
}

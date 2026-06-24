"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notify";

const prisma = new PrismaClient();

export async function toggleVote(ideaId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const existing = await prisma.ideaVote.findUnique({
    where: { ideaId_userId: { ideaId, userId: session.user.id } },
  });

  if (existing) {
    await prisma.ideaVote.delete({ where: { id: existing.id } });
  } else {
    await prisma.ideaVote.create({ data: { ideaId, userId: session.user.id } });

    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: { title: true, authorId: true },
    });
    if (idea && idea.authorId !== session.user.id) {
      const voter = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      });
      await createNotification({
        userId: idea.authorId,
        type: "idea_vote",
        title: `${voter?.name ?? "Someone"} voted on your idea`,
        body: idea.title,
        url: `/ideas/${ideaId}`,
      });
    }
  }

  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/ideas");
}

export async function addComment(ideaId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  if (!content.trim()) return { error: "Comment is empty" };

  await prisma.ideaComment.create({
    data: { ideaId, authorId: session.user.id, content: content.trim() },
  });

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { title: true, authorId: true },
  });
  if (idea && idea.authorId !== session.user.id) {
    const commenter = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });
    await createNotification({
      userId: idea.authorId,
      type: "idea_comment",
      title: `${commenter?.name ?? "Someone"} commented on your idea`,
      body: idea.title,
      url: `/ideas/${ideaId}`,
    });
  }

  revalidatePath(`/ideas/${ideaId}`);
}

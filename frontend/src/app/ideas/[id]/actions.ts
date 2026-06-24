"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

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

  revalidatePath(`/ideas/${ideaId}`);
}

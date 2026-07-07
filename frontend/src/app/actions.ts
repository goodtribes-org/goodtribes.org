"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createFeedPost(body: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const trimmed = body.trim();
  if (!trimmed) return { error: "Post is empty" };

  await prisma.feedPost.create({
    data: { authorId: session.user.id, body: trimmed },
  });

  revalidatePath("/");
}

export async function toggleFeedLike(targetType: string, targetId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const existing = await prisma.feedLike.findUnique({
    where: { userId_targetType_targetId: { userId: session.user.id, targetType, targetId } },
  });

  if (existing) {
    await prisma.feedLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.feedLike.create({
      data: { userId: session.user.id, targetType, targetId },
    });
  }

  revalidatePath("/");
}

export async function addFeedComment(targetType: string, targetId: string, body: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const trimmed = body.trim();
  if (!trimmed) return { error: "Comment is empty" };

  await prisma.feedComment.create({
    data: { authorId: session.user.id, targetType, targetId, body: trimmed },
  });

  revalidatePath("/");
}

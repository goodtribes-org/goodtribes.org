"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  addComment as addKanbanCardComment,
  toggleCardCommentLike,
} from "@/app/[locale]/projects/[slug]/(workspace)/kanban/actions";
import { sendRoomMessage, toggleReaction } from "@/app/[locale]/messages/actions";
import { FEED_LIKE_EMOJI } from "@/lib/activityFeed";

export async function createFeedPost(body: string, imageUrl?: string | null) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const trimmed = body.trim();
  if (!trimmed && !imageUrl) return { error: "Post is empty" };

  await prisma.feedPost.create({
    data: { authorId: session.user.id, body: trimmed, imageUrl: imageUrl || null },
  });

  revalidatePath("/");
}

export async function toggleFeedLike(targetType: string, targetId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  if (targetType === "kanbanCardComment") {
    return toggleCardCommentLike(targetId);
  }

  if (targetType === "channelMessage") {
    const message = await prisma.message.findUnique({
      where: { id: targetId },
      select: { roomId: true },
    });
    if (!message) return { error: "Message not found" };
    try {
      await toggleReaction(targetId, message.roomId, FEED_LIKE_EMOJI);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to toggle like" };
    }
    revalidatePath("/");
    revalidatePath("/feed");
    return { ok: true };
  }

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

  if (targetType === "kanbanCardComment") {
    const target = await prisma.kanbanCardComment.findUnique({
      where: { id: targetId },
      select: { cardId: true },
    });
    if (!target) return { error: "Comment not found" };
    const result = await addKanbanCardComment(target.cardId, trimmed);
    if ("error" in result) return result;
    revalidatePath("/");
    revalidatePath("/feed");
    return { ok: true };
  }

  if (targetType === "channelMessage") {
    const message = await prisma.message.findUnique({
      where: { id: targetId },
      select: { roomId: true },
    });
    if (!message) return { error: "Message not found" };
    try {
      await sendRoomMessage(message.roomId, trimmed, targetId);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to send reply" };
    }
    revalidatePath("/");
    revalidatePath("/feed");
    return { ok: true };
  }

  await prisma.feedComment.create({
    data: { authorId: session.user.id, targetType, targetId, body: trimmed },
  });

  revalidatePath("/");
}

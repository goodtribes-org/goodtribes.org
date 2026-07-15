import { prisma } from "@/lib/prisma";
import type { ContentHideReason } from "@prisma/client";

export const TARGET_TYPES = [
  "FeedPost",
  "FeedComment",
  "IdeaComment",
  "Message",
  "DreamWallPost",
  "KanbanCardComment",
  "LeanCanvasComment",
] as const;

export type ContentTargetType = (typeof TARGET_TYPES)[number];

export function isContentTargetType(value: string): value is ContentTargetType {
  return (TARGET_TYPES as readonly string[]).includes(value);
}

// Number of distinct PENDING flags on the same target before it's hidden
// automatically, ahead of any admin review.
export const AUTO_HOLD_THRESHOLD = 3;

export async function targetExists(targetType: ContentTargetType, targetId: string): Promise<boolean> {
  switch (targetType) {
    case "FeedPost":
      return (await prisma.feedPost.findUnique({ where: { id: targetId }, select: { id: true } })) !== null;
    case "FeedComment":
      return (await prisma.feedComment.findUnique({ where: { id: targetId }, select: { id: true } })) !== null;
    case "IdeaComment":
      return (await prisma.ideaComment.findUnique({ where: { id: targetId }, select: { id: true } })) !== null;
    case "Message":
      return (await prisma.message.findUnique({ where: { id: targetId }, select: { id: true } })) !== null;
    case "DreamWallPost":
      return (await prisma.dreamWallPost.findUnique({ where: { id: targetId }, select: { id: true } })) !== null;
    case "KanbanCardComment":
      return (await prisma.kanbanCardComment.findUnique({ where: { id: targetId }, select: { id: true } })) !== null;
    case "LeanCanvasComment":
      return (await prisma.leanCanvasComment.findUnique({ where: { id: targetId }, select: { id: true } })) !== null;
  }
}

export async function hideTarget(
  targetType: ContentTargetType,
  targetId: string,
  opts: { hiddenById: string | null; hiddenReason: ContentHideReason }
): Promise<void> {
  const data = {
    hiddenAt: new Date(),
    hiddenById: opts.hiddenById,
    hiddenReason: opts.hiddenReason,
  };
  switch (targetType) {
    case "FeedPost":
      await prisma.feedPost.update({ where: { id: targetId }, data });
      return;
    case "FeedComment":
      await prisma.feedComment.update({ where: { id: targetId }, data });
      return;
    case "IdeaComment":
      await prisma.ideaComment.update({ where: { id: targetId }, data });
      return;
    case "Message":
      await prisma.message.update({ where: { id: targetId }, data });
      return;
    case "DreamWallPost":
      await prisma.dreamWallPost.update({ where: { id: targetId }, data });
      return;
    case "KanbanCardComment":
      await prisma.kanbanCardComment.update({ where: { id: targetId }, data });
      return;
    case "LeanCanvasComment":
      await prisma.leanCanvasComment.update({ where: { id: targetId }, data });
      return;
  }
}

export async function unhideTarget(targetType: ContentTargetType, targetId: string): Promise<void> {
  const data = { hiddenAt: null, hiddenById: null, hiddenReason: null };
  switch (targetType) {
    case "FeedPost":
      await prisma.feedPost.update({ where: { id: targetId }, data });
      return;
    case "FeedComment":
      await prisma.feedComment.update({ where: { id: targetId }, data });
      return;
    case "IdeaComment":
      await prisma.ideaComment.update({ where: { id: targetId }, data });
      return;
    case "Message":
      await prisma.message.update({ where: { id: targetId }, data });
      return;
    case "DreamWallPost":
      await prisma.dreamWallPost.update({ where: { id: targetId }, data });
      return;
    case "KanbanCardComment":
      await prisma.kanbanCardComment.update({ where: { id: targetId }, data });
      return;
    case "LeanCanvasComment":
      await prisma.leanCanvasComment.update({ where: { id: targetId }, data });
      return;
  }
}

// Short excerpt of the flagged content, shown in the admin review queue.
export async function getTargetPreview(targetType: ContentTargetType, targetId: string): Promise<string | null> {
  switch (targetType) {
    case "FeedPost": {
      const row = await prisma.feedPost.findUnique({ where: { id: targetId }, select: { body: true } });
      return row?.body ?? null;
    }
    case "FeedComment": {
      const row = await prisma.feedComment.findUnique({ where: { id: targetId }, select: { body: true } });
      return row?.body ?? null;
    }
    case "IdeaComment": {
      const row = await prisma.ideaComment.findUnique({ where: { id: targetId }, select: { content: true } });
      return row?.content ?? null;
    }
    case "Message": {
      const row = await prisma.message.findUnique({ where: { id: targetId }, select: { body: true } });
      return row?.body ?? null;
    }
    case "DreamWallPost": {
      const row = await prisma.dreamWallPost.findUnique({ where: { id: targetId }, select: { dreamText: true } });
      return row?.dreamText ?? null;
    }
    case "KanbanCardComment": {
      const row = await prisma.kanbanCardComment.findUnique({ where: { id: targetId }, select: { body: true } });
      return row?.body ?? null;
    }
    case "LeanCanvasComment": {
      const row = await prisma.leanCanvasComment.findUnique({ where: { id: targetId }, select: { body: true } });
      return row?.body ?? null;
    }
  }
}

export async function isTargetHidden(targetType: ContentTargetType, targetId: string): Promise<boolean> {
  switch (targetType) {
    case "FeedPost":
      return (await prisma.feedPost.findUnique({ where: { id: targetId }, select: { hiddenAt: true } }))?.hiddenAt != null;
    case "FeedComment":
      return (await prisma.feedComment.findUnique({ where: { id: targetId }, select: { hiddenAt: true } }))?.hiddenAt != null;
    case "IdeaComment":
      return (await prisma.ideaComment.findUnique({ where: { id: targetId }, select: { hiddenAt: true } }))?.hiddenAt != null;
    case "Message":
      return (await prisma.message.findUnique({ where: { id: targetId }, select: { hiddenAt: true } }))?.hiddenAt != null;
    case "DreamWallPost":
      return (await prisma.dreamWallPost.findUnique({ where: { id: targetId }, select: { hiddenAt: true } }))?.hiddenAt != null;
    case "KanbanCardComment":
      return (await prisma.kanbanCardComment.findUnique({ where: { id: targetId }, select: { hiddenAt: true } }))?.hiddenAt != null;
    case "LeanCanvasComment":
      return (await prisma.leanCanvasComment.findUnique({ where: { id: targetId }, select: { hiddenAt: true } }))?.hiddenAt != null;
  }
}

// Called right after a new ContentFlag is created. Hides the target the
// moment enough distinct users have flagged it, ahead of admin review.
export async function autoHoldIfThresholdReached(targetType: ContentTargetType, targetId: string): Promise<void> {
  const pendingCount = await prisma.contentFlag.count({
    where: { targetType, targetId, status: "PENDING" },
  });
  if (pendingCount < AUTO_HOLD_THRESHOLD) return;
  if (await isTargetHidden(targetType, targetId)) return;

  await hideTarget(targetType, targetId, { hiddenById: null, hiddenReason: "AUTO_FLAG_THRESHOLD" });
}

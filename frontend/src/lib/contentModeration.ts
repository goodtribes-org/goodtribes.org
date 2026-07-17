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
  "Project",
  "Organisation",
  "WikiPage",
  "AcademyGuide",
  "User",
  "Idea",
] as const;

export type ContentTargetType = (typeof TARGET_TYPES)[number];

export function isContentTargetType(value: string): value is ContentTargetType {
  return (TARGET_TYPES as readonly string[]).includes(value);
}

// Number of distinct PENDING flags on the same target before it's hidden
// automatically, ahead of any admin review.
export const AUTO_HOLD_THRESHOLD = 3;

// Whole-entity target types are excluded from auto-hold: unpublishing an
// entire project/org after 3 flags is high-blast-radius and should always
// go through an admin/ethics review, unlike auto-hiding a single comment.
const AUTO_HOLD_EXCLUDED = new Set<ContentTargetType>(["Project", "Organisation", "User"]);

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
    case "Project":
      return (await prisma.project.findUnique({ where: { id: targetId }, select: { id: true } })) !== null;
    case "Organisation":
      return (await prisma.organisation.findUnique({ where: { id: targetId }, select: { id: true } })) !== null;
    case "WikiPage":
      return (await prisma.wikiPage.findUnique({ where: { id: targetId }, select: { id: true } })) !== null;
    case "AcademyGuide":
      return (await prisma.academyGuide.findUnique({ where: { id: targetId }, select: { id: true } })) !== null;
    case "User":
      return (await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } })) !== null;
    case "Idea":
      return (await prisma.idea.findUnique({ where: { id: targetId }, select: { id: true } })) !== null;
  }
}

export async function hideTarget(
  targetType: ContentTargetType,
  targetId: string,
  opts: { hiddenById: string | null; hiddenReason: ContentHideReason }
): Promise<void> {
  // Project/Organisation reuse their existing visibility toggles (already
  // flipped by site-admin/projects and site-admin/organisations) instead of
  // the hiddenAt triad — whole-entity moderation should look and behave the
  // same whether it came from a flag or a manual admin action.
  if (targetType === "Project") {
    await prisma.project.update({ where: { id: targetId }, data: { visibility: "private" } });
    return;
  }
  if (targetType === "Organisation") {
    await prisma.organisation.update({ where: { id: targetId }, data: { isPublic: false } });
    return;
  }
  if (targetType === "User") {
    // Deliberate no-op: reusing showProfile would let a suspended-for-cause
    // user just flip their own visibility back on from settings, unlike
    // Project.visibility/Organisation.isPublic which are owned by an admin
    // toggle, not the flagged party themselves. The real remedy for a
    // flagged profile is suspending the account via site-admin/users.
    return;
  }

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
    case "WikiPage":
      await prisma.wikiPage.update({ where: { id: targetId }, data });
      return;
    case "AcademyGuide":
      await prisma.academyGuide.update({ where: { id: targetId }, data });
      return;
    case "Idea":
      await prisma.idea.update({ where: { id: targetId }, data });
      return;
  }
}

export async function unhideTarget(targetType: ContentTargetType, targetId: string): Promise<void> {
  if (targetType === "Project") {
    await prisma.project.update({ where: { id: targetId }, data: { visibility: "public" } });
    return;
  }
  if (targetType === "Organisation") {
    await prisma.organisation.update({ where: { id: targetId }, data: { isPublic: true } });
    return;
  }
  if (targetType === "User") return; // see hideTarget

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
    case "WikiPage":
      await prisma.wikiPage.update({ where: { id: targetId }, data });
      return;
    case "AcademyGuide":
      await prisma.academyGuide.update({ where: { id: targetId }, data });
      return;
    case "Idea":
      await prisma.idea.update({ where: { id: targetId }, data });
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
    case "Project": {
      const row = await prisma.project.findUnique({ where: { id: targetId }, select: { title: true, summary: true } });
      return row ? `${row.title}${row.summary ? ` — ${row.summary}` : ""}` : null;
    }
    case "Organisation": {
      const row = await prisma.organisation.findUnique({ where: { id: targetId }, select: { name: true, description: true } });
      return row ? `${row.name}${row.description ? ` — ${row.description}` : ""}` : null;
    }
    case "WikiPage": {
      const row = await prisma.wikiPage.findUnique({ where: { id: targetId }, select: { title: true, content: true } });
      return row ? `${row.title} — ${row.content}` : null;
    }
    case "AcademyGuide": {
      const row = await prisma.academyGuide.findUnique({ where: { id: targetId }, select: { title: true, bodyMarkdown: true } });
      return row ? `${row.title} — ${row.bodyMarkdown}` : null;
    }
    case "User": {
      const row = await prisma.user.findUnique({ where: { id: targetId }, select: { name: true, bio: true } });
      return row ? `${row.name ?? "Okänd"}${row.bio ? ` — ${row.bio}` : ""}` : null;
    }
    case "Idea": {
      const row = await prisma.idea.findUnique({ where: { id: targetId }, select: { title: true, problem: true } });
      return row ? `${row.title}${row.problem ? ` — ${row.problem}` : ""}` : null;
    }
  }
}

export async function isTargetHidden(targetType: ContentTargetType, targetId: string): Promise<boolean> {
  if (targetType === "Project") {
    const row = await prisma.project.findUnique({ where: { id: targetId }, select: { visibility: true } });
    return row?.visibility !== "public";
  }
  if (targetType === "Organisation") {
    return (await prisma.organisation.findUnique({ where: { id: targetId }, select: { isPublic: true } }))?.isPublic === false;
  }
  if (targetType === "User") return false; // hideTarget is a no-op for User, see above
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
    case "WikiPage":
      return (await prisma.wikiPage.findUnique({ where: { id: targetId }, select: { hiddenAt: true } }))?.hiddenAt != null;
    case "AcademyGuide":
      return (await prisma.academyGuide.findUnique({ where: { id: targetId }, select: { hiddenAt: true } }))?.hiddenAt != null;
    case "Idea":
      return (await prisma.idea.findUnique({ where: { id: targetId }, select: { hiddenAt: true } }))?.hiddenAt != null;
  }
}

// Called right after a new ContentFlag is created. Hides the target the
// moment enough distinct users have flagged it, ahead of admin review.
export async function autoHoldIfThresholdReached(targetType: ContentTargetType, targetId: string): Promise<void> {
  if (AUTO_HOLD_EXCLUDED.has(targetType)) return;

  const pendingCount = await prisma.contentFlag.count({
    where: { targetType, targetId, status: "PENDING" },
  });
  if (pendingCount < AUTO_HOLD_THRESHOLD) return;
  if (await isTargetHidden(targetType, targetId)) return;

  await hideTarget(targetType, targetId, { hiddenById: null, hiddenReason: "AUTO_FLAG_THRESHOLD" });
}

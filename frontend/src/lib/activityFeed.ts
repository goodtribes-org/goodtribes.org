import { prisma } from "@/lib/prisma";
import { htmlToPreviewText } from "@/lib/renderBody";
import { timeAgo } from "@/lib/timeAgo";
import { FEED_LIKE_EMOJI } from "@/lib/feedLikeEmoji";

export { FEED_LIKE_EMOJI };

export type PulseItem = {
  id: string;
  targetType: string;
  targetId: string;
  avatarName: string | null;
  avatarImage: string | null;
  projectImage?: string | null;
  projectId?: string | null;
  projectName: string;
  projectHref?: string | null;
  action: string;
  body?: string;
  subtasks?: { title: string; done: boolean }[];
  imageUrl?: string | null;
  href: string | null;
  date: Date;
  cardId?: string;
  projectSlug?: string;
};

const activityLabel: Record<string, string> = {
  member_joined:  "gick med i projektet",
  task_completed: "slutförde en uppgift",
  task_created:   "skapade en uppgift",
  task_moved:     "flyttade en uppgift",
  todo_completed: "checkade av en punkt",
};

const columnLabel: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "Att göra",
  DOING: "Pågår",
  REVIEW: "Granskning",
  DONE: "Klart",
};

// Each source is fetched independently and over-fetched, then merged/sorted/sliced by the
// caller — so `perSourceLimit` should be at least as large as the window the caller needs.
//
// `opts.projectId`/`projectSlug` switch every source from "public, site-wide" to "just this
// project" — see docs/PRD.md's "Flöde i projekten" entry. Two sources don't make sense scoped
// to a single project and are skipped entirely in that mode: `project` (new-project
// announcements) and `idea`/`ideaComment` (ideas aren't tied to a project in this schema).
export async function fetchActivityItems(
  perSourceLimit: number,
  opts?: { projectId: string; projectSlug: string }
): Promise<PulseItem[]> {
  const LIMIT = perSourceLimit;

  const [feedPosts, blogPosts, milestones, projects, ideas, activities, channelMessages, kanbanComments, ideaComments] =
    await Promise.all([
      prisma.feedPost.findMany({
        where: opts ? { hiddenAt: null, projectId: opts.projectId } : { hiddenAt: null, projectId: null },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true, body: true, imageUrl: true, createdAt: true,
          author: { select: { name: true, image: true } },
        },
      }),
      prisma.blogPost.findMany({
        where: opts ? { projectSlug: opts.projectSlug } : { project: { visibility: "public" } },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true, title: true, projectSlug: true, createdAt: true,
          author: { select: { name: true, image: true } },
          project: { select: { id: true, title: true, imageUrl: true } },
        },
      }),
      prisma.milestone.findMany({
        where: opts
          ? { status: "done", projectId: opts.projectId }
          : { status: "done", project: { visibility: "public" } },
        orderBy: { updatedAt: "desc" },
        take: LIMIT,
        select: {
          id: true, title: true, updatedAt: true,
          createdBy: { select: { name: true, image: true } },
          project: { select: { id: true, title: true, slug: true, imageUrl: true } },
        },
      }),
      opts
        ? Promise.resolve([])
        : prisma.project.findMany({
            where: { visibility: "public" },
            orderBy: { createdAt: "desc" },
            take: LIMIT,
            select: {
              id: true, title: true, slug: true, createdAt: true, imageUrl: true,
              owner: { select: { name: true, image: true } },
            },
          }),
      opts
        ? Promise.resolve([])
        : prisma.idea.findMany({
            where: { hiddenAt: null },
            orderBy: { createdAt: "desc" },
            take: LIMIT,
            select: {
              id: true, title: true, problem: true, solution: true, createdAt: true,
              author: { select: { name: true, image: true } },
            },
          }),
      prisma.activityEvent.findMany({
        where: {
          type: { in: ["task_completed", "task_created", "task_moved", "todo_completed", "member_joined"] },
          ...(opts ? { projectId: opts.projectId } : { project: { visibility: "public" } }),
        },
        orderBy: { createdAt: "desc" },
        take: LIMIT * 2,
        select: {
          id: true, type: true, payload: true, createdAt: true,
          user: { select: { name: true, image: true } },
          project: { select: { id: true, title: true, slug: true, imageUrl: true } },
        },
      }),
      prisma.message.findMany({
        where: {
          threadParentId: null,
          hiddenAt: null,
          room: opts
            ? { type: "PROJECT_CHANNEL", projectId: opts.projectId }
            : { type: "PROJECT_CHANNEL", project: { visibility: "public" } },
        },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true, body: true, roomId: true, createdAt: true,
          author: { select: { name: true, image: true } },
          room: { select: { project: { select: { id: true, title: true, slug: true, imageUrl: true } } } },
        },
      }),
      prisma.kanbanCardComment.findMany({
        where: {
          hiddenAt: null,
          card: opts ? { projectSlug: opts.projectSlug } : { project: { visibility: "public" } },
        },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true, body: true, createdAt: true,
          author: { select: { name: true, image: true } },
          card: {
            select: {
              id: true, title: true, projectSlug: true,
              project: { select: { id: true, title: true, imageUrl: true } },
            },
          },
        },
      }),
      opts
        ? Promise.resolve([])
        : prisma.ideaComment.findMany({
            where: { hiddenAt: null },
            orderBy: { createdAt: "desc" },
            take: LIMIT,
            select: {
              id: true, content: true, createdAt: true,
              author: { select: { name: true, image: true } },
              idea: { select: { id: true, title: true } },
            },
          }),
    ]);

  // Only the most recent comment per card becomes its own activity item — further replies
  // (whether added on the card itself or via the feed's reply box) update that same item's
  // preview/timestamp instead of spawning a new post; the full thread is still shown when expanded.
  const latestKanbanCommentByCard = new Map<string, (typeof kanbanComments)[number]>();
  for (const c of kanbanComments) {
    if (!latestKanbanCommentByCard.has(c.card.id)) latestKanbanCommentByCard.set(c.card.id, c);
  }
  const dedupedKanbanComments = [...latestKanbanCommentByCard.values()];

  const items: PulseItem[] = [
    ...feedPosts.map((p) => ({
      id: `post-${p.id}`, targetType: "feedPost", targetId: p.id,
      avatarName: p.author.name, avatarImage: p.author.image,
      projectName: "Inlägg", projectHref: null, projectId: null,
      action: "skrev ett inlägg",
      body: p.body,
      imageUrl: p.imageUrl,
      href: null, date: p.createdAt,
    })),
    ...blogPosts.map((p) => ({
      id: `blog-${p.id}`, targetType: "blogPost", targetId: p.id,
      avatarName: p.author.name, avatarImage: p.author.image, projectImage: p.project.imageUrl,
      projectName: p.project.title, projectHref: `/projects/${p.projectSlug}`, projectId: p.project.id,
      action: "postade en uppdatering",
      href: `/projects/${p.projectSlug}/updates#post-${p.id}`, date: p.createdAt,
    })),
    ...milestones.map((m) => ({
      id: `milestone-${m.id}`, targetType: "milestone", targetId: m.id,
      avatarName: m.createdBy.name, avatarImage: m.createdBy.image, projectImage: m.project.imageUrl,
      projectName: m.project.title, projectHref: `/projects/${m.project.slug}`, projectId: m.project.id,
      action: `Milstolpe klar: ${m.title}`,
      href: `/projects/${m.project.slug}/calendar#milestone-${m.id}`, date: m.updatedAt,
    })),
    ...projects.map((p) => ({
      id: `project-${p.id}`, targetType: "project", targetId: p.id,
      avatarName: p.owner.name, avatarImage: p.owner.image, projectImage: p.imageUrl,
      projectName: p.title, projectHref: `/projects/${p.slug}`, projectId: p.id,
      action: "Nytt projekt skapat",
      href: `/projects/${p.slug}`, date: p.createdAt,
    })),
    ...ideas.map((i) => {
      const parts = [];
      if (i.problem) parts.push(`Problem: ${i.problem}`);
      if (i.solution) parts.push(`Lösning: ${i.solution}`);
      return {
        id: `idea-${i.id}`, targetType: "idea", targetId: i.id,
        avatarName: i.author.name, avatarImage: i.author.image,
        projectName: "Idéer", projectHref: "/ideas", projectId: null,
        action: `Ny idé: ${i.title}`,
        body: parts.length > 0 ? parts.join(" ") : undefined,
        href: `/ideas/${i.id}`, date: i.createdAt,
      };
    }),
    ...activities.map((a) => {
      const payload = a.payload as unknown as {
        title?: string; cardId?: string; description?: string | null;
        fromColumn?: string; toColumn?: string;
        subtasks?: { title: string; done: boolean }[];
      } | null;
      const project = a.project!;
      const isCardActivity = a.type === "task_completed" || a.type === "task_created" || a.type === "task_moved";
      const action =
        a.type === "task_completed" && payload?.title
          ? `slutförde uppgiften "${payload.title}"`
          : a.type === "task_created" && payload?.title
          ? `skapade uppgiften "${payload.title}"`
          : a.type === "task_moved" && payload?.title
          ? `flyttade uppgiften "${payload.title}" till ${columnLabel[payload.toColumn ?? ""] ?? payload.toColumn}`
          : activityLabel[a.type] ?? "aktivitet";
      const href =
        isCardActivity && payload?.cardId
          ? `/projects/${project.slug}/tasks?card=${payload.cardId}`
          : `/projects/${project.slug}`;
      const body =
        a.type !== "task_moved" && payload?.description
          ? htmlToPreviewText(payload.description)
          : undefined;
      const subtasks =
        a.type !== "task_moved" && payload?.subtasks && payload.subtasks.length > 0
          ? payload.subtasks
          : undefined;
      return {
        id: `activity-${a.id}`, targetType: "activityEvent", targetId: a.id,
        avatarName: a.user.name, avatarImage: a.user.image, projectImage: project.imageUrl,
        projectName: project.title, projectHref: `/projects/${project.slug}`, projectId: project.id,
        action,
        body,
        subtasks,
        href, date: a.createdAt,
      };
    }),
    ...channelMessages.map((m) => {
      const project = m.room.project!;
      return {
        id: `msg-${m.id}`, targetType: "channelMessage", targetId: m.id,
        projectSlug: project.slug,
        avatarName: m.author.name, avatarImage: m.author.image, projectImage: project.imageUrl,
        projectName: project.title, projectHref: `/projects/${project.slug}`, projectId: project.id,
        action: "skickade ett meddelande",
        body: htmlToPreviewText(m.body),
        href: `/messages/${m.roomId}`, date: m.createdAt,
      };
    }),
    ...dedupedKanbanComments.map((c) => ({
      id: `kcomment-${c.id}`, targetType: "kanbanCardComment", targetId: c.id,
      cardId: c.card.id,
      projectSlug: c.card.projectSlug,
      avatarName: c.author.name, avatarImage: c.author.image, projectImage: c.card.project.imageUrl,
      projectName: c.card.project.title, projectHref: `/projects/${c.card.projectSlug}`, projectId: c.card.project.id,
      action: `kommenterade på "${c.card.title}"`,
      body: htmlToPreviewText(c.body),
      href: `/projects/${c.card.projectSlug}/tasks?card=${c.card.id}`, date: c.createdAt,
    })),
    ...ideaComments.map((c) => ({
      id: `icomment-${c.id}`, targetType: "ideaComment", targetId: c.id,
      avatarName: c.author.name, avatarImage: c.author.image,
      projectName: "Idéer", projectHref: "/ideas", projectId: null,
      action: `kommenterade på idén "${c.idea.title}"`,
      body: c.content,
      href: `/ideas/${c.idea.id}#comment-${c.id}`, date: c.createdAt,
    })),
  ];

  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  return items;
}

export type FeedComment = { id: string; author: string; body: string; timeAgo: string };

export type FeedInteractionData = {
  likeCountByTarget: Map<string, number>;
  likedByMe: Set<string>;
  commentsByTarget: Map<string, FeedComment[]>;
  memberProjectIds: Set<string>;
  pendingJoinProjectIds: Set<string>;
};

// Activity item types whose comments/likes write into a project-scoped table (KanbanCardComment,
// Message/MessageReaction on a PROJECT_CHANNEL room) and therefore require ProjectMember to
// interact with — all other types (feedPost, blogPost, milestone, project, idea, activityEvent,
// ideaComment) are unrestricted. The "channelMessage" targetType string is kept as-is (rather
// than renamed to "message") so historical FeedLike/FeedComment rows keep resolving correctly.
export const MEMBERSHIP_GATED_TARGET_TYPES = new Set(["kanbanCardComment", "channelMessage"]);

// Comments for kanbanCardComment items are sourced from KanbanCardComment (keyed by cardId),
// and comments for channelMessage items are sourced from Message thread replies (keyed
// by threadParentId) — rather than FeedComment/FeedLike — so a comment or like made from the
// feed and one made on the card/channel itself are the same row and always show identically
// on both surfaces.
export async function getFeedInteractionData(items: PulseItem[], userId: string | null): Promise<FeedInteractionData> {
  const kanbanItems = items.filter((i) => i.targetType === "kanbanCardComment" && i.cardId);
  const channelItems = items.filter((i) => i.targetType === "channelMessage");
  const otherItems = items.filter((i) => i.targetType !== "kanbanCardComment" && i.targetType !== "channelMessage");
  const otherTargetsOr = otherItems.map((i) => ({ targetType: i.targetType, targetId: i.targetId }));
  const genericLikeTargetsOr = items
    .filter((i) => i.targetType !== "channelMessage")
    .map((i) => ({ targetType: i.targetType, targetId: i.targetId }));
  const distinctCardIds = [...new Set(kanbanItems.map((i) => i.cardId!))];
  const distinctChannelMessageIds = [...new Set(channelItems.map((i) => i.targetId))];
  const distinctProjectIds = [...new Set(items.map((i) => i.projectId).filter((id): id is string => !!id))];

  const [likes, otherComments, cardComments, channelReplies, channelReactions, memberRows, pendingRows] = await Promise.all([
    genericLikeTargetsOr.length > 0 ? prisma.feedLike.findMany({ where: { OR: genericLikeTargetsOr } }) : Promise.resolve([]),
    otherTargetsOr.length > 0
      ? prisma.feedComment.findMany({
          where: { OR: otherTargetsOr, hiddenAt: null },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true } } },
        })
      : Promise.resolve([]),
    distinctCardIds.length > 0
      ? prisma.kanbanCardComment.findMany({
          where: { cardId: { in: distinctCardIds }, hiddenAt: null },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true } } },
        })
      : Promise.resolve([]),
    distinctChannelMessageIds.length > 0
      ? prisma.message.findMany({
          where: { threadParentId: { in: distinctChannelMessageIds }, hiddenAt: null },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true } } },
        })
      : Promise.resolve([]),
    distinctChannelMessageIds.length > 0
      ? prisma.messageReaction.findMany({
          where: { messageId: { in: distinctChannelMessageIds }, emoji: FEED_LIKE_EMOJI },
        })
      : Promise.resolve([]),
    userId && distinctProjectIds.length > 0
      ? prisma.projectMember.findMany({
          where: { userId, projectId: { in: distinctProjectIds } },
          select: { projectId: true },
        })
      : Promise.resolve([]),
    userId && distinctProjectIds.length > 0
      ? prisma.projectJoinRequest.findMany({
          where: { userId, projectId: { in: distinctProjectIds }, status: "pending" },
          select: { projectId: true },
        })
      : Promise.resolve([]),
  ]);

  const likeCountByTarget = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const l of likes) {
    const key = `${l.targetType}:${l.targetId}`;
    likeCountByTarget.set(key, (likeCountByTarget.get(key) ?? 0) + 1);
    if (userId && l.userId === userId) likedByMe.add(key);
  }
  for (const r of channelReactions) {
    const key = `channelMessage:${r.messageId}`;
    likeCountByTarget.set(key, (likeCountByTarget.get(key) ?? 0) + 1);
    if (userId && r.userId === userId) likedByMe.add(key);
  }

  const commentsByTarget = new Map<string, FeedComment[]>();
  for (const c of otherComments) {
    const key = `${c.targetType}:${c.targetId}`;
    const arr = commentsByTarget.get(key) ?? [];
    arr.push({ id: c.id, author: c.author.name ?? "Någon", body: c.body, timeAgo: timeAgo(c.createdAt) });
    commentsByTarget.set(key, arr);
  }

  const commentsByCardId = new Map<string, FeedComment[]>();
  for (const c of cardComments) {
    const arr = commentsByCardId.get(c.cardId) ?? [];
    arr.push({ id: c.id, author: c.author.name ?? "Någon", body: htmlToPreviewText(c.body), timeAgo: timeAgo(c.createdAt) });
    commentsByCardId.set(c.cardId, arr);
  }
  for (const item of kanbanItems) {
    commentsByTarget.set(`${item.targetType}:${item.targetId}`, commentsByCardId.get(item.cardId!) ?? []);
  }

  const commentsByThreadParent = new Map<string, FeedComment[]>();
  for (const c of channelReplies) {
    const arr = commentsByThreadParent.get(c.threadParentId!) ?? [];
    arr.push({ id: c.id, author: c.author.name ?? "Någon", body: htmlToPreviewText(c.body), timeAgo: timeAgo(c.createdAt) });
    commentsByThreadParent.set(c.threadParentId!, arr);
  }
  for (const item of channelItems) {
    commentsByTarget.set(`${item.targetType}:${item.targetId}`, commentsByThreadParent.get(item.targetId) ?? []);
  }

  return {
    likeCountByTarget,
    likedByMe,
    commentsByTarget,
    memberProjectIds: new Set(memberRows.map((m) => m.projectId)),
    pendingJoinProjectIds: new Set(pendingRows.map((r) => r.projectId)),
  };
}

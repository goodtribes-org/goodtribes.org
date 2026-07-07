import { prisma } from "@/lib/prisma";
import { htmlToPreviewText } from "@/lib/renderBody";

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
export async function fetchActivityItems(perSourceLimit: number): Promise<PulseItem[]> {
  const LIMIT = perSourceLimit;

  const [feedPosts, blogPosts, milestones, projects, ideas, activities, channelMessages, kanbanComments, ideaComments] =
    await Promise.all([
      prisma.feedPost.findMany({
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true, body: true, imageUrl: true, createdAt: true,
          author: { select: { name: true, image: true } },
        },
      }),
      prisma.blogPost.findMany({
        where: { project: { visibility: "public" } },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true, title: true, projectSlug: true, createdAt: true,
          author: { select: { name: true, image: true } },
          project: { select: { id: true, title: true, imageUrl: true } },
        },
      }),
      prisma.milestone.findMany({
        where: { status: "done", project: { visibility: "public" } },
        orderBy: { updatedAt: "desc" },
        take: LIMIT,
        select: {
          id: true, title: true, updatedAt: true,
          createdBy: { select: { name: true, image: true } },
          project: { select: { id: true, title: true, slug: true, imageUrl: true } },
        },
      }),
      prisma.project.findMany({
        where: { visibility: "public" },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true, title: true, slug: true, createdAt: true, imageUrl: true,
          owner: { select: { name: true, image: true } },
        },
      }),
      prisma.idea.findMany({
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
          project: { visibility: "public" },
        },
        orderBy: { createdAt: "desc" },
        take: LIMIT * 2,
        select: {
          id: true, type: true, payload: true, createdAt: true,
          user: { select: { name: true, image: true } },
          project: { select: { id: true, title: true, slug: true, imageUrl: true } },
        },
      }),
      prisma.channelMessage.findMany({
        where: {
          threadParentId: null,
          channel: { project: { visibility: "public" } },
        },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true, body: true, channelId: true, createdAt: true,
          author: { select: { name: true, image: true } },
          channel: { select: { project: { select: { id: true, title: true, slug: true, imageUrl: true } } } },
        },
      }),
      prisma.kanbanCardComment.findMany({
        where: { card: { project: { visibility: "public" } } },
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
      prisma.ideaComment.findMany({
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true, content: true, createdAt: true,
          author: { select: { name: true, image: true } },
          idea: { select: { id: true, title: true } },
        },
      }),
    ]);

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
      href: `/projects/${m.project.slug}/milestones#milestone-${m.id}`, date: m.updatedAt,
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
          ? `/projects/${a.project.slug}/tasks?card=${payload.cardId}`
          : `/projects/${a.project.slug}`;
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
        avatarName: a.user.name, avatarImage: a.user.image, projectImage: a.project.imageUrl,
        projectName: a.project.title, projectHref: `/projects/${a.project.slug}`, projectId: a.project.id,
        action,
        body,
        subtasks,
        href, date: a.createdAt,
      };
    }),
    ...channelMessages.map((m) => ({
      id: `msg-${m.id}`, targetType: "channelMessage", targetId: m.id,
      avatarName: m.author.name, avatarImage: m.author.image, projectImage: m.channel.project.imageUrl,
      projectName: m.channel.project.title, projectHref: `/projects/${m.channel.project.slug}`, projectId: m.channel.project.id,
      action: "skickade ett meddelande",
      body: htmlToPreviewText(m.body),
      href: `/projects/${m.channel.project.slug}/kanaler/${m.channelId}#message-${m.id}`, date: m.createdAt,
    })),
    ...kanbanComments.map((c) => ({
      id: `kcomment-${c.id}`, targetType: "kanbanCardComment", targetId: c.id,
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

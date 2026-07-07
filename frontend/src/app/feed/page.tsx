export const revalidate = 60;

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma"
import Link from "next/link";

export const metadata: Metadata = {
  title: "Plattformsflöde — GoodTribes.org",
  description: "Senaste aktivitet från hela GoodTribes",
};

const PAGE_SIZE = 10;
const FETCH_LIMIT = 10;

type FeedItem =
  | { kind: "blog";            id: string; title: string; projectSlug: string; authorName: string | null; date: Date }
  | { kind: "project";         id: string; title: string; slug: string; category: string | null; memberCount: number; date: Date }
  | { kind: "milestone";       id: string; title: string; projectTitle: string; projectSlug: string; date: Date }
  | { kind: "idea";            id: string; title: string; category: string | null; authorName: string | null; date: Date }
  | { kind: "activity";        id: string; activityType: "task_completed" | "todo_completed" | "member_joined"; projectTitle: string; projectSlug: string; userName: string | null; date: Date; cardId?: string; taskTitle?: string }
  | { kind: "channel_message"; id: string; projectTitle: string; projectSlug: string; userName: string | null; date: Date }
  | { kind: "kanban_comment";  id: string; cardTitle: string; projectTitle: string; projectSlug: string; userName: string | null; date: Date }
  | { kind: "idea_comment";    id: string; ideaId: string; ideaTitle: string; userName: string | null; date: Date };

function relativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just nu";
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes} minut${minutes === 1 ? "" : "er"} sedan`;
  const hours = Math.floor(diff / 3600);
  if (hours < 24) return `${hours} timm${hours === 1 ? "e" : "ar"} sedan`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days} dag${days === 1 ? "" : "ar"} sedan`;
  const weeks = Math.floor(days / 7);
  return `${weeks} veck${weeks === 1 ? "a" : "or"} sedan`;
}

const ICON_CONFIG = {
  blog:            { emoji: "✍️",  bg: "bg-blue-100"   },
  project:         { emoji: "🚀",  bg: "bg-green-100"  },
  milestone:       { emoji: "🎯",  bg: "bg-purple-100" },
  idea:            { emoji: "💡",  bg: "bg-yellow-100" },
  channel_message: { emoji: "💬",  bg: "bg-sky-100"    },
  kanban_comment:  { emoji: "💬",  bg: "bg-slate-100"  },
  idea_comment:    { emoji: "💬",  bg: "bg-amber-100"  },
} as const;

const ACTIVITY_ICON: Record<string, { emoji: string; bg: string }> = {
  member_joined:  { emoji: "👤", bg: "bg-indigo-100" },
  task_completed: { emoji: "✅", bg: "bg-teal-100"   },
  todo_completed: { emoji: "☑️", bg: "bg-cyan-100"   },
};

function itemIcon(item: FeedItem): { emoji: string; bg: string } {
  if (item.kind === "activity") return ACTIVITY_ICON[item.activityType] ?? { emoji: "⚡", bg: "bg-orange-100" };
  return ICON_CONFIG[item.kind];
}

function itemTitle(item: FeedItem): string {
  switch (item.kind) {
    case "blog":            return `Ny uppdatering: ${item.title}`;
    case "project":         return `Nytt projekt: ${item.title}`;
    case "milestone":       return `Milstolpe uppnådd: ${item.title}`;
    case "idea":            return `Ny idé: ${item.title}`;
    case "channel_message": return `${item.userName ?? "Någon"} skickade ett meddelande i ${item.projectTitle}`;
    case "kanban_comment":  return `${item.userName ?? "Någon"} kommenterade på uppgiften "${item.cardTitle}"`;
    case "idea_comment":    return `${item.userName ?? "Någon"} kommenterade på idén "${item.ideaTitle}"`;
    case "activity":
      switch (item.activityType) {
        case "member_joined":  return `${item.userName ?? "Någon"} gick med i ${item.projectTitle}`;
        case "task_completed": return item.taskTitle
          ? `${item.userName ?? "Någon"} slutförde uppgiften "${item.taskTitle}" i ${item.projectTitle}`
          : `${item.userName ?? "Någon"} slutförde en uppgift i ${item.projectTitle}`;
        case "todo_completed": return `${item.userName ?? "Någon"} checkade av en punkt i ${item.projectTitle}`;
      }
  }
}

function itemHref(item: FeedItem): string {
  switch (item.kind) {
    case "blog":            return `/projects/${item.projectSlug}/updates`;
    case "project":         return `/projects/${item.slug}`;
    case "milestone":       return `/projects/${item.projectSlug}/milestones`;
    case "idea":            return `/ideas/${item.id}`;
    case "channel_message": return `/projects/${item.projectSlug}`;
    case "kanban_comment":  return `/projects/${item.projectSlug}`;
    case "idea_comment":    return `/ideas/${item.ideaId}`;
    case "activity":        return item.activityType === "task_completed" && item.cardId
      ? `/projects/${item.projectSlug}/tasks?card=${item.cardId}`
      : `/projects/${item.projectSlug}`;
  }
}

function itemMeta(item: FeedItem): string {
  switch (item.kind) {
    case "blog":            return item.authorName ?? "Okänd";
    case "project":         return item.category ? `${item.memberCount} medlemmar · ${item.category}` : `${item.memberCount} medlemmar`;
    case "milestone":       return item.projectTitle;
    case "idea":            return item.authorName ?? "Okänd";
    case "channel_message": return item.projectTitle;
    case "kanban_comment":  return item.projectTitle;
    case "idea_comment":    return item.ideaTitle;
    case "activity":        return item.projectTitle;
  }
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);

  const [
    rawBlogPosts,
    rawProjects,
    rawMilestones,
    rawIdeas,
    rawActivities,
    rawChannelMessages,
    rawKanbanComments,
    rawIdeaComments,
  ] = await Promise.all([
    prisma.blogPost.findMany({
      take: FETCH_LIMIT,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, projectSlug: true, createdAt: true,
        author: { select: { name: true } },
      },
    }),
    prisma.project.findMany({
      take: FETCH_LIMIT,
      where: { visibility: "public" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, slug: true, category: true, createdAt: true,
        _count: { select: { members: true } },
      },
    }),
    prisma.milestone.findMany({
      take: FETCH_LIMIT,
      where: { status: "done" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, title: true, updatedAt: true,
        project: { select: { title: true, slug: true } },
      },
    }),
    prisma.idea.findMany({
      take: FETCH_LIMIT,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, category: true, createdAt: true,
        author: { select: { name: true } },
      },
    }),
    prisma.activityEvent.findMany({
      take: FETCH_LIMIT * 3,
      where: {
        type: { in: ["task_completed", "todo_completed", "member_joined"] },
        project: { visibility: "public" },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, type: true, payload: true, createdAt: true,
        user: { select: { name: true } },
        project: { select: { title: true, slug: true } },
      },
    }),
    prisma.channelMessage.findMany({
      take: FETCH_LIMIT,
      where: {
        threadParentId: null,
        channel: { project: { visibility: "public" } },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, createdAt: true,
        author: { select: { name: true } },
        channel: { select: { project: { select: { title: true, slug: true } } } },
      },
    }),
    prisma.kanbanCardComment.findMany({
      take: FETCH_LIMIT,
      where: { card: { project: { visibility: "public" } } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, createdAt: true,
        author: { select: { name: true } },
        card: {
          select: {
            title: true,
            projectSlug: true,
            project: { select: { title: true } },
          },
        },
      },
    }),
    prisma.ideaComment.findMany({
      take: FETCH_LIMIT,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, createdAt: true,
        author: { select: { name: true } },
        idea: { select: { id: true, title: true } },
      },
    }),
  ]);

  const feedItems: FeedItem[] = [
    ...rawBlogPosts.map((p): FeedItem => ({
      kind: "blog", id: p.id, title: p.title, projectSlug: p.projectSlug,
      authorName: p.author.name, date: p.createdAt,
    })),
    ...rawProjects.map((p): FeedItem => ({
      kind: "project", id: p.id, title: p.title, slug: p.slug,
      category: p.category, memberCount: p._count.members, date: p.createdAt,
    })),
    ...rawMilestones.map((m): FeedItem => ({
      kind: "milestone", id: m.id, title: m.title,
      projectTitle: m.project.title, projectSlug: m.project.slug, date: m.updatedAt,
    })),
    ...rawIdeas.map((i): FeedItem => ({
      kind: "idea", id: i.id, title: i.title, category: i.category,
      authorName: i.author.name, date: i.createdAt,
    })),
    ...rawActivities.map((a): FeedItem => {
      const payload = a.payload as unknown as { title?: string; cardId?: string } | null;
      return {
        kind: "activity", id: a.id,
        activityType: a.type as "task_completed" | "todo_completed" | "member_joined",
        projectTitle: a.project.title, projectSlug: a.project.slug,
        userName: a.user.name, date: a.createdAt,
        cardId: payload?.cardId, taskTitle: payload?.title,
      };
    }),
    ...rawChannelMessages.map((m): FeedItem => ({
      kind: "channel_message", id: m.id,
      projectTitle: m.channel.project.title, projectSlug: m.channel.project.slug,
      userName: m.author.name, date: m.createdAt,
    })),
    ...rawKanbanComments.map((c): FeedItem => ({
      kind: "kanban_comment", id: c.id,
      cardTitle: c.card.title, projectTitle: c.card.project.title,
      projectSlug: c.card.projectSlug, userName: c.author.name, date: c.createdAt,
    })),
    ...rawIdeaComments.map((c): FeedItem => ({
      kind: "idea_comment", id: c.id,
      ideaId: c.idea.id, ideaTitle: c.idea.title,
      userName: c.author.name, date: c.createdAt,
    })),
  ];

  feedItems.sort((a, b) => b.date.getTime() - a.date.getTime());

  const allItems = feedItems.slice(0, 40);
  const total = allItems.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pageItems = allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function pageHref(p: number) {
    if (p <= 1) return "/feed";
    return `/feed?page=${p}`;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-slate">Plattformsflöde</h1>
        <p className="text-sm text-dark-slate/50 mt-1">Senaste aktivitet från hela GoodTribes</p>
      </div>

      {pageItems.length === 0 ? (
        <div className="border border-dashed border-muted-teal/40 rounded-lg p-12 text-center">
          <p className="text-dark-slate/40 text-sm">Ingen aktivitet ännu.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pageItems.map((item) => {
            const cfg = itemIcon(item);
            const href = itemHref(item);
            return (
              <Link
                key={`${item.kind}-${item.id}`}
                href={href}
                className="flex items-start gap-4 border border-muted-teal/40 rounded-lg p-4 bg-white hover:shadow-md hover:border-muted-teal transition-all group"
              >
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-lg ${cfg.bg}`} aria-hidden="true">
                  {cfg.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-dark-slate text-sm leading-snug group-hover:text-coral transition-colors line-clamp-2">
                    {itemTitle(item)}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-dark-slate/50">{itemMeta(item)}</span>
                    <span className="text-xs text-dark-slate/30">·</span>
                    <span className="text-xs text-dark-slate/40">{relativeTime(item.date)}</span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-dark-slate/30 flex-shrink-0 mt-0.5 group-hover:text-coral transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="px-4 py-2 text-sm rounded border border-muted-teal/40 text-dark-slate/60 hover:text-dark-slate hover:border-dark-slate/40 transition-colors">
              ← Tillbaka
            </Link>
          )}
          <span className="text-sm text-dark-slate/40">Sida {page} av {totalPages}</span>
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className="px-4 py-2 text-sm rounded border border-muted-teal/40 bg-white text-dark-slate hover:shadow-sm hover:border-muted-teal transition-all font-medium">
              Visa fler →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

import { prisma } from "@/lib/prisma";

// Data for "Mitt GoodTribes" (/my-goodtribes) tabs; the calendar also feeds
// the personal bar's quick panel (components/PersonalBar.tsx, via
// /api/me/panel), so the tab and the panel always show the same thing.

const liveProject = { hiddenAt: null, archivedAt: null };

async function activeProjects(userId: string) {
  return prisma.projectMember.findMany({
    where: { userId, role: { not: "FOLLOWER" }, project: liveProject },
    select: { project: { select: { id: true, slug: true } } },
  });
}

// Tasks assigned to you and not done, soonest due first; and open to-do items
// you created in your projects' lists (to-do items have no assignee).
export async function getMyTasks(userId: string, take = 50) {
  const projects = await activeProjects(userId);
  const slugs = projects.map((m) => m.project.slug);
  const [cards, todos] = await Promise.all([
    prisma.kanbanCard.findMany({
      where: { assigneeId: userId, column: { not: "DONE" }, project: liveProject },
      select: { id: true, title: true, dueDate: true, column: true, project: { select: { slug: true, title: true } } },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      take,
    }),
    slugs.length
      ? prisma.todoItem.findMany({
          where: { createdById: userId, done: false, projectSlug: { in: slugs } },
          select: { id: true, title: true, dueDate: true, project: { select: { slug: true, title: true } } },
          orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
          take,
        })
      : Promise.resolve([]),
  ]);
  return { cards, todos };
}

// Upcoming calendar events and open milestones across your projects, in date order.
export async function getMyCalendar(userId: string, take = 30) {
  const projects = await activeProjects(userId);
  if (projects.length === 0) return [];
  const now = new Date();
  const [events, milestones] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { projectSlug: { in: projects.map((m) => m.project.slug) }, startsAt: { gte: now } },
      select: { id: true, title: true, startsAt: true, project: { select: { slug: true, title: true } } },
      orderBy: { startsAt: "asc" },
      take,
    }),
    prisma.milestone.findMany({
      where: { projectId: { in: projects.map((m) => m.project.id) }, completedAt: null, dueDate: { gte: now } },
      select: { id: true, title: true, dueDate: true, project: { select: { slug: true, title: true } } },
      orderBy: { dueDate: "asc" },
      take,
    }),
  ]);
  return [
    ...events.map((e) => ({ kind: "event" as const, id: e.id, title: e.title, at: e.startsAt, project: e.project, href: `/projects/${e.project.slug}/calendar` })),
    ...milestones.map((m) => ({ kind: "milestone" as const, id: m.id, title: m.title, at: m.dueDate!, project: m.project, href: `/projects/${m.project.slug}/calendar#milestone-${m.id}` })),
  ]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, take);
}

// Projects you follow, ideas you follow, and projects you've liked (♥).
export async function getMyFollowing(userId: string) {
  const [followed, ideas, likes] = await Promise.all([
    prisma.projectMember.findMany({
      where: { userId, role: "FOLLOWER", project: liveProject },
      select: { project: { select: { id: true, slug: true, title: true, phase: true } } },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.ideaFollower.findMany({
      where: { userId },
      select: { idea: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.feedLike.findMany({ where: { userId, targetType: "project" }, select: { targetId: true }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const liked = likes.length
    ? await prisma.project.findMany({ where: { id: { in: likes.map((l) => l.targetId) }, ...liveProject }, select: { id: true, slug: true, title: true, phase: true } })
    : [];
  return { projects: followed.map((f) => f.project), ideas: ideas.map((f) => f.idea), liked };
}

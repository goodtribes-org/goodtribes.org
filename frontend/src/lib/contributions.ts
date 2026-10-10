import type { ProjectPhase, ProjectRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PUBLIC_PROJECT_WHERE } from "@/lib/projectVisibility";

// What someone has done on GoodTribes, for their member page (#293): per
// project their role, the tasks they finished and the project's verified
// impact, plus the thanks they got. Shareable as a merit (students,
// company volunteers), so it only ever shows published projects and only
// what the project itself shows publicly.

const RECENT_TASKS = 3;
const RECENT_THANKS = 3;

export type ProjectContribution = {
  slug: string;
  title: string;
  phase: ProjectPhase;
  // null: never joined — helped with a first task from outside.
  role: ProjectRole | null;
  since: Date;
  tasksDone: number;
  subtasksDone: number;
  recentTasks: string[];
  verifiedImpact: number;
  lastAt: Date;
};

export type Contributions = {
  projects: ProjectContribution[];
  tasksDone: number;
  thanks: { count: number; recent: { message: string; from: string | null; project: string | null; at: Date }[] };
};

type Card = { title: string; projectSlug: string; updatedAt: Date };
type Membership = { role: ProjectRole; joinedAt: Date; project: { slug: string; title: string; phase: ProjectPhase } };

// Pure: the per-project list from the raw rows. A follower who did nothing
// isn't a contribution; anyone who finished something is, member or not.
export function groupContributions(
  memberships: Membership[],
  cards: (Card & { project: { title: string; phase: ProjectPhase } })[],
  subtasks: { projectSlug: string; completedAt: Date | null }[],
  impactBySlug: Map<string, number>,
): ProjectContribution[] {
  const bySlug = new Map<string, ProjectContribution>();
  const entry = (slug: string, title: string, phase: ProjectPhase, since: Date) => {
    let e = bySlug.get(slug);
    if (!e) {
      e = { slug, title, phase, role: null, since, tasksDone: 0, subtasksDone: 0, recentTasks: [], verifiedImpact: impactBySlug.get(slug) ?? 0, lastAt: since };
      bySlug.set(slug, e);
    }
    return e;
  };
  for (const m of memberships) {
    const e = entry(m.project.slug, m.project.title, m.project.phase, m.joinedAt);
    e.role = m.role;
    e.since = m.joinedAt;
  }
  for (const c of [...cards].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())) {
    const e = entry(c.projectSlug, c.project.title, c.project.phase, c.updatedAt);
    e.tasksDone++;
    if (e.recentTasks.length < RECENT_TASKS) e.recentTasks.push(c.title);
    if (c.updatedAt > e.lastAt) e.lastAt = c.updatedAt;
    if (e.role === null && c.updatedAt < e.since) e.since = c.updatedAt;
  }
  for (const s of subtasks) {
    const e = bySlug.get(s.projectSlug);
    if (!e) continue; // a subtask alone, in a project you're not part of: too small to list
    e.subtasksDone++;
    if (s.completedAt && s.completedAt > e.lastAt) e.lastAt = s.completedAt;
  }
  return [...bySlug.values()]
    .filter((e) => e.role !== "FOLLOWER" || e.tasksDone > 0)
    .sort((a, b) => b.tasksDone - a.tasksDone || b.lastAt.getTime() - a.lastAt.getTime());
}

export async function getContributions(userId: string): Promise<Contributions> {
  const publicProject = { project: PUBLIC_PROJECT_WHERE };
  const [memberships, cards, subtasks, thanksCount, thanks] = await Promise.all([
    prisma.projectMember.findMany({
      where: { userId, ...publicProject },
      select: { role: true, joinedAt: true, project: { select: { slug: true, title: true, phase: true } } },
    }),
    prisma.kanbanCard.findMany({
      where: { assigneeId: userId, column: "DONE", ...publicProject },
      select: { title: true, projectSlug: true, updatedAt: true, project: { select: { title: true, phase: true } } },
    }),
    prisma.kanbanCardSubtask.findMany({
      where: { completedById: userId, done: true, card: publicProject },
      select: { completedAt: true, card: { select: { projectSlug: true } } },
    }),
    prisma.kudos.count({ where: { toUserId: userId } }),
    prisma.kudos.findMany({
      where: { toUserId: userId, targetType: null },
      orderBy: { createdAt: "desc" },
      take: RECENT_THANKS,
      select: { message: true, createdAt: true, fromUser: { select: { name: true } }, project: { select: { title: true, publishedAt: true, hiddenAt: true } } },
    }),
  ]);

  const slugs = [...new Set([...memberships.map((m) => m.project.slug), ...cards.map((c) => c.projectSlug)])];
  const impact = slugs.length
    ? await prisma.impactReport.groupBy({
        by: ["projectId"],
        where: { project: { slug: { in: slugs } }, kind: "DELIVERED", verifiedAt: { not: null }, rejectedAt: null },
        _count: { _all: true },
      })
    : [];
  const idToSlug = impact.length
    ? new Map((await prisma.project.findMany({ where: { id: { in: impact.map((i) => i.projectId) } }, select: { id: true, slug: true } })).map((p) => [p.id, p.slug]))
    : new Map<string, string>();
  const impactBySlug = new Map(impact.map((i) => [idToSlug.get(i.projectId) ?? "", i._count._all]));

  const projects = groupContributions(
    memberships,
    cards,
    subtasks.map((s) => ({ projectSlug: s.card.projectSlug, completedAt: s.completedAt })),
    impactBySlug,
  );

  return {
    projects,
    tasksDone: projects.reduce((s, p) => s + p.tasksDone, 0),
    thanks: {
      count: thanksCount,
      recent: thanks.map((k) => ({
        message: k.message,
        from: k.fromUser.name,
        // A draft's or hidden project's name stays private.
        project: k.project && k.project.publishedAt && !k.project.hiddenAt ? k.project.title : null,
        at: k.createdAt,
      })),
    },
  };
}

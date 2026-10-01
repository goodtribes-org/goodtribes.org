import { prisma } from "@/lib/prisma";
import { PROJECT_LEAD_ROLES } from "@/lib/authz";
import { getProjectJourney } from "@/lib/projectJourney";
import { toDisplayPhase, type ProjectPhaseValue } from "@/lib/projectPhase";

// "Din tribe": a logged-in member's own view at the top of the start page. It
// answers two questions — what should I do ("Att göra"), and are my projects
// moving or standing still ("Pulsen i dina projekt").

export const PULSE_WEEKS = 4;
// Last activity within MOVING_DAYS → "I rörelse"; within SLOWING_DAYS →
// "Saktar in"; older or none → "Står still".
export const MOVING_DAYS = 7;
export const SLOWING_DAYS = 14;
const MAX_TODOS = 7;
const MAX_NEXT_STEPS = 4;
const DAY = 24 * 60 * 60 * 1000;

export type PulseStatus = "moving" | "slowing" | "still";

export type TodoItem =
  | { kind: "task"; id: string; title: string; project: string; href: string; due: Date | null; overdue: boolean }
  | { kind: "joinRequest"; id: string; name: string | null; project: string; href: string }
  // step is a ProjectPhaseChecklist key (translated in the UI)
  | { kind: "nextStep"; id: string; project: string; step: string; href: string; projectStill: boolean };

export type LastEvent =
  | { type: "activity"; who: string | null; activityType: string; title?: string; tool?: string; at: Date }
  | { type: "message"; who: string | null; at: Date }
  | { type: "blogPost"; who: string | null; title: string; at: Date };

export function pulseStatus(lastAt: Date | null, now: number): PulseStatus {
  if (!lastAt) return "still";
  const days = (now - lastAt.getTime()) / DAY;
  return days <= MOVING_DAYS ? "moving" : days <= SLOWING_DAYS ? "slowing" : "still";
}

// Counts per week, oldest first, the last bucket ending now.
export function weeklyCounts(dates: Date[], now: number, weeks = PULSE_WEEKS): number[] {
  return Array.from({ length: weeks }, (_, i) => {
    const end = now - (weeks - 1 - i) * 7 * DAY;
    const start = end - 7 * DAY;
    return dates.filter((d) => d.getTime() > start && d.getTime() <= end).length;
  });
}

// Overdue tasks, then tasks due within 3 days, join requests waiting for an
// answer, next steps in projects you lead (standing-still ones first — a
// nudge helps most there), then other tasks.
function todoRank(t: TodoItem, now: number): number {
  if (t.kind === "task") {
    if (t.overdue) return 0;
    if (t.due && t.due.getTime() - now <= 3 * DAY) return 1;
    return 5;
  }
  if (t.kind === "joinRequest") return 2;
  return t.projectStill ? 3 : 4;
}

export async function getYourTribe(userId: string, now = Date.now()) {
  const since = new Date(now - PULSE_WEEKS * 7 * DAY);
  const liveProject = { hiddenAt: null, archivedAt: null };

  const memberships = await prisma.projectMember.findMany({
    where: { userId, role: { not: "FOLLOWER" }, project: liveProject },
    select: { role: true, project: { select: { id: true, slug: true, title: true, phase: true, imageUrl: true } } },
  });
  const projects = memberships.map((m) => ({ ...m.project, isLead: (PROJECT_LEAD_ROLES as string[]).includes(m.role) }));
  const ids = projects.map((p) => p.id);
  const slugs = projects.map((p) => p.slug);
  const leadIds = projects.filter((p) => p.isLead).map((p) => p.id);

  const [tasks, joinRequests, unreadNotifications, newKudos, events, messages, posts, lastEvents] = await Promise.all([
    prisma.kanbanCard.findMany({
      where: { assigneeId: userId, column: { not: "DONE" }, project: liveProject },
      select: { id: true, title: true, dueDate: true, project: { select: { slug: true, title: true } } },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      take: 20,
    }),
    leadIds.length
      ? prisma.projectJoinRequest.findMany({
          where: { projectId: { in: leadIds }, status: "pending" },
          select: { id: true, user: { select: { name: true } }, project: { select: { slug: true, title: true } } },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    prisma.notification.count({ where: { userId, read: false } }),
    prisma.kudos.count({ where: { toUserId: userId, createdAt: { gte: new Date(now - 7 * DAY) } } }),
    // Pulse sources over the last PULSE_WEEKS: project events, project chat, blog posts.
    ids.length
      ? prisma.activityEvent.findMany({ where: { projectId: { in: ids }, createdAt: { gte: since } }, select: { projectId: true, createdAt: true } })
      : Promise.resolve([]),
    ids.length
      ? prisma.message.findMany({ where: { room: { projectId: { in: ids } }, createdAt: { gte: since } }, select: { createdAt: true, room: { select: { projectId: true } } } })
      : Promise.resolve([]),
    slugs.length
      ? prisma.blogPost.findMany({ where: { projectSlug: { in: slugs }, createdAt: { gte: since } }, select: { projectSlug: true, createdAt: true } })
      : Promise.resolve([]),
    // The latest thing that happened in each project, of any age.
    Promise.all(
      projects.map(async (p) => {
        const [a, m, b] = await Promise.all([
          prisma.activityEvent.findFirst({ where: { projectId: p.id }, orderBy: { createdAt: "desc" }, select: { type: true, payload: true, createdAt: true, user: { select: { name: true } } } }),
          prisma.message.findFirst({ where: { room: { projectId: p.id } }, orderBy: { createdAt: "desc" }, select: { createdAt: true, author: { select: { name: true } } } }),
          prisma.blogPost.findFirst({ where: { projectSlug: p.slug }, orderBy: { createdAt: "desc" }, select: { title: true, createdAt: true, author: { select: { name: true } } } }),
        ]);
        const candidates: LastEvent[] = [];
        if (a) {
          const payload = a.payload as { title?: string; tool?: string } | null;
          candidates.push({ type: "activity", who: a.user.name, activityType: a.type, title: payload?.title, tool: payload?.tool, at: a.createdAt });
        }
        if (m) candidates.push({ type: "message", who: m.author.name, at: m.createdAt });
        if (b) candidates.push({ type: "blogPost", who: b.author.name, title: b.title, at: b.createdAt });
        candidates.sort((x, y) => y.at.getTime() - x.at.getTime());
        return [p.id, candidates[0] ?? null] as const;
      }),
    ),
  ]);

  const datesByProject = new Map<string, Date[]>(ids.map((id) => [id, []]));
  const idBySlug = new Map(projects.map((p) => [p.slug, p.id]));
  for (const e of events) datesByProject.get(e.projectId!)?.push(e.createdAt);
  for (const m of messages) datesByProject.get(m.room.projectId!)?.push(m.createdAt);
  for (const b of posts) datesByProject.get(idBySlug.get(b.projectSlug)!)?.push(b.createdAt);
  const lastByProject = new Map(lastEvents);

  const pulse = projects
    .map((p) => {
      const last = lastByProject.get(p.id) ?? null;
      const weeks = weeklyCounts(datesByProject.get(p.id) ?? [], now);
      return {
        id: p.id, slug: p.slug, title: p.title, imageUrl: p.imageUrl, isLead: p.isLead,
        phase: toDisplayPhase(p.phase as ProjectPhaseValue),
        weeks, total: weeks.reduce((s, n) => s + n, 0), last, status: pulseStatus(last?.at ?? null, now),
      };
    })
    // Most active first — seeing the projects that move is encouraging.
    .sort((a, b) => b.total - a.total || (b.last?.at.getTime() ?? 0) - (a.last?.at.getTime() ?? 0));

  // Next step in projects you lead (the most active ones, up to MAX_NEXT_STEPS).
  const steps = await Promise.all(
    pulse.filter((p) => p.isLead).slice(0, MAX_NEXT_STEPS).map(async (p): Promise<TodoItem | null> => {
      const journey = await getProjectJourney({ id: p.id, slug: p.slug, phase: p.phase });
      if (!journey.nextStepKey || !journey.nextStepHref) return null;
      return { kind: "nextStep", id: `step-${p.id}`, project: p.title, step: journey.nextStepKey, href: journey.nextStepHref, projectStill: p.status === "still" };
    }),
  );

  const todos: TodoItem[] = [
    ...tasks.map((t): TodoItem => ({
      kind: "task", id: t.id, title: t.title, project: t.project.title, href: `/projects/${t.project.slug}/tasks?card=${t.id}`,
      due: t.dueDate, overdue: !!t.dueDate && t.dueDate.getTime() < now,
    })),
    ...joinRequests.map((r): TodoItem => ({ kind: "joinRequest", id: r.id, name: r.user.name, project: r.project.title, href: `/projects/${r.project.slug}/members` })),
    ...steps.filter((s): s is TodoItem => !!s),
  ].sort((a, b) => todoRank(a, now) - todoRank(b, now));

  return {
    unreadNotifications,
    newKudos,
    todos: todos.slice(0, MAX_TODOS),
    todoTotal: todos.length,
    pulse,
  };
}

export type YourTribeData = Awaited<ReturnType<typeof getYourTribe>>;

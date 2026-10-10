import { prisma } from "@/lib/prisma";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { PUBLIC_PROJECT_WHERE } from "@/lib/projectVisibility";

// The funnel and the North Star for site admins (#292). The funnel follows
// the 3 December evening's three steps: an account → a dream → a first task
// opened in it → helped someone else → still active after 30 days. The North
// Star is how many published projects had at least two people active in a
// week. Everything is counted from tables that already exist; nothing about
// visitors without an account (that would need a cookie/analytics decision).
// The AI participant user is left out everywhere — it is in every project.

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
export const METRIC_WEEKS = 8;
export const ACTIVE_FROM_DAY = 30;
export const ACTIVE_TO_DAY = 60;

// Weeks start on Monday 00:00 UTC.
export function weekStart(d: Date): Date {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const offset = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - offset * DAY_MS);
}

export function recentWeeks(now: Date, count = METRIC_WEEKS): Date[] {
  const current = weekStart(now).getTime();
  return Array.from({ length: count }, (_, i) => new Date(current - (count - 1 - i) * WEEK_MS));
}

export type Activity = { userId: string; projectId: string | null; at: Date };

export type FunnelRow = {
  week: Date;
  accounts: number;
  dreamed: number;
  openedTask: number;
  helped: number;
  // null while the cohort is younger than ACTIVE_TO_DAY days: not knowable yet.
  active30: number | null;
};

export function cohortFunnel(
  users: { id: string; createdAt: Date }[],
  steps: { dreamed: Set<string>; openedTask: Set<string>; helped: Set<string> },
  activity: Activity[],
  weeks: Date[],
  now: Date,
): FunnelRow[] {
  const activeLater = new Set<string>();
  const created = new Map(users.map((u) => [u.id, u.createdAt.getTime()]));
  for (const a of activity) {
    const c = created.get(a.userId);
    if (c === undefined) continue;
    const day = (a.at.getTime() - c) / DAY_MS;
    if (day >= ACTIVE_FROM_DAY && day < ACTIVE_TO_DAY) activeLater.add(a.userId);
  }
  return weeks.map((week) => {
    const end = week.getTime() + WEEK_MS;
    const cohort = users.filter((u) => u.createdAt >= week && u.createdAt.getTime() < end);
    const knowable = end + ACTIVE_TO_DAY * DAY_MS <= now.getTime();
    const count = (s: Set<string>) => cohort.filter((u) => s.has(u.id)).length;
    return {
      week,
      accounts: cohort.length,
      dreamed: count(steps.dreamed),
      openedTask: count(steps.openedTask),
      helped: count(steps.helped),
      active30: knowable ? count(activeLater) : null,
    };
  });
}

// Published projects with at least `minPeople` different people active in
// them, per week.
export function northStarByWeek(activity: Activity[], publishedIds: Set<string>, weeks: Date[], minPeople = 2): number[] {
  return weeks.map((week) => {
    const end = week.getTime() + WEEK_MS;
    const people = new Map<string, Set<string>>();
    for (const a of activity) {
      if (!a.projectId || !publishedIds.has(a.projectId) || a.at < week || a.at.getTime() >= end) continue;
      if (!people.has(a.projectId)) people.set(a.projectId, new Set());
      people.get(a.projectId)!.add(a.userId);
    }
    return [...people.values()].filter((s) => s.size >= minPeople).length;
  });
}

// What anyone did in a project, from `since`: the activity log, project chat
// and offers to help with a first task.
async function loadActivity(since: Date, aiUserId: string, userIds?: string[]): Promise<Activity[]> {
  const byUser = userIds ? { in: userIds } : { not: aiUserId };
  const [events, messages, offers] = await Promise.all([
    prisma.activityEvent.findMany({ where: { createdAt: { gte: since }, userId: byUser }, select: { userId: true, projectId: true, createdAt: true } }),
    prisma.message.findMany({
      where: { createdAt: { gte: since }, isAi: false, authorId: byUser, room: { projectId: { not: null } } },
      select: { authorId: true, createdAt: true, room: { select: { projectId: true } } },
    }),
    prisma.taskOffer.findMany({
      where: { createdAt: { gte: since }, userId: byUser },
      select: { userId: true, createdAt: true, card: { select: { project: { select: { id: true } } } } },
    }),
  ]);
  return [
    ...events.map((e) => ({ userId: e.userId, projectId: e.projectId, at: e.createdAt })),
    ...messages.map((m) => ({ userId: m.authorId, projectId: m.room.projectId, at: m.createdAt })),
    ...offers.map((o) => ({ userId: o.userId, projectId: o.card.project?.id ?? null, at: o.createdAt })),
  ].filter((a) => a.userId !== aiUserId);
}

export type EventSummary = { code: string; title: string; startsAt: Date | null; people: number; dreams: number; firstTasks: number; helped: number };

export type Metrics = {
  weeks: Date[];
  funnel: FunnelRow[];
  northStar: number[];
  events: EventSummary[];
};

export async function getMetrics(now = new Date()): Promise<Metrics> {
  const weeks = recentWeeks(now);
  const start = weeks[0];
  const ai = await getAiParticipantUser();

  const users = await prisma.user.findMany({ where: { createdAt: { gte: start }, id: { not: ai.id } }, select: { id: true, createdAt: true } });
  const ids = users.map((u) => u.id);

  const [ownedProjects, offers, claimed, cohortActivity, recentActivity, published, events] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: { in: ids } },
      select: { ownerId: true, kanbanCards: { where: { openToPublic: true }, select: { id: true }, take: 1 } },
    }),
    prisma.taskOffer.findMany({ where: { userId: { in: ids } }, select: { userId: true, card: { select: { project: { select: { ownerId: true } } } } } }),
    prisma.kanbanCard.findMany({
      where: { openToPublic: true, claimedAt: { not: null }, assigneeId: { in: ids } },
      select: { assigneeId: true, project: { select: { ownerId: true } } },
    }),
    loadActivity(new Date(start.getTime() + ACTIVE_FROM_DAY * DAY_MS), ai.id, ids),
    loadActivity(start, ai.id),
    prisma.project.findMany({ where: PUBLIC_PROJECT_WHERE, select: { id: true } }),
    prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { code: true, title: true, startsAt: true, actions: { select: { userId: true, type: true } } },
    }),
  ]);

  const dreamed = new Set(ownedProjects.map((p) => p.ownerId));
  const openedTask = new Set(ownedProjects.filter((p) => p.kanbanCards.length > 0).map((p) => p.ownerId));
  // Helping someone else: an offer or a taken first task in a project that isn't your own.
  const helped = new Set([
    ...offers.filter((o) => o.card.project && o.card.project.ownerId !== o.userId).map((o) => o.userId),
    ...claimed.filter((c) => c.assigneeId && c.project && c.project.ownerId !== c.assigneeId).map((c) => c.assigneeId!),
  ]);

  return {
    weeks,
    funnel: cohortFunnel(users, { dreamed, openedTask, helped }, cohortActivity, weeks, now),
    northStar: northStarByWeek(recentActivity, new Set(published.map((p) => p.id)), weeks),
    events: events.map((e) => {
      const distinct = (types: string[]) => new Set(e.actions.filter((a) => types.includes(a.type)).map((a) => a.userId)).size;
      return {
        code: e.code,
        title: e.title,
        startsAt: e.startsAt,
        people: new Set(e.actions.map((a) => a.userId)).size,
        dreams: distinct(["DREAM"]),
        firstTasks: distinct(["FIRST_TASK"]),
        helped: distinct(["OFFER", "TAKE"]),
      };
    }),
  };
}

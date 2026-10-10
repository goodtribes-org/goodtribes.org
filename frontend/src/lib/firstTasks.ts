import type { FirstTaskTime, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPriorityTokenValue } from "@/lib/priorityTokens";
import { PUBLIC_PROJECT_WHERE } from "@/lib/projectVisibility";
import { isNewAccount, newAccountCapReached } from "@/lib/firstTaskLimits";

// Första uppgifter (#277): the way into a project for someone from outside.
// A first task is an ordinary board card with openToPublic, written for a
// helper (why it matters, roughly how long, where). Anyone can take it — or,
// when the project's leads choose (firstTaskChoose), sign up with an answer to
// their question, and a lead picks one. Whoever does it becomes a medskapare
// the usual way: tokens are paid when the card lands in Done, through
// moveKanbanCard like every other card. Nothing here mints anything.

export const FIRST_TASK_TIMES = ["MIN15", "HOUR1", "HOURS2_4", "RECURRING"] as const satisfies readonly FirstTaskTime[];
export const MAX_FIRST_TASK_TEXT = 500;
export const MAX_OFFER_TEXT = 1000;

export type FirstTaskFields = {
  why: string | null;
  time: FirstTaskTime | null;
  place: string | null;
  choose: boolean;
  question: string | null;
  maxOffers: number | null;
};

const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

// From the card editor (the browser), so rebuilt field by field.
export function parseFirstTaskFields(raw: unknown): FirstTaskFields {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const max = typeof r.maxOffers === "number" && Number.isInteger(r.maxOffers) && r.maxOffers > 0 ? Math.min(r.maxOffers, 50) : null;
  const choose = r.choose === true;
  return {
    why: text(r.why, MAX_FIRST_TASK_TEXT),
    time: FIRST_TASK_TIMES.find((t) => t === r.time) ?? null,
    place: text(r.place, 120),
    choose,
    // A question and a cap only mean something when the leads choose.
    question: choose ? text(r.question, 300) : null,
    maxOffers: choose ? max : null,
  };
}

// Whether someone can still take or sign up for the card right now.
export function isOpenFirstTask(card: { openToPublic: boolean; assigneeId: string | null; column: string; source: string }): boolean {
  return card.openToPublic && !card.assigneeId && card.column !== "DONE" && card.source !== "github";
}

export function offersFull(card: { firstTaskChoose: boolean; firstTaskMaxOffers: number | null }, pendingOffers: number): boolean {
  return card.firstTaskChoose && card.firstTaskMaxOffers !== null && pendingOffers >= card.firstTaskMaxOffers;
}

export type OpenFirstTask = {
  id: string;
  title: string;
  why: string | null;
  time: FirstTaskTime | null;
  place: string | null;
  choose: boolean;
  question: string | null;
  tokens: number;
  full: boolean;
  myOffer: "PENDING" | "CHOSEN" | "DECLINED" | "WITHDRAWN" | null;
};

// The project's open first tasks, for its page. Tokens shown are what the
// card pays today (its priority's value), the same number the board shows.
export async function getOpenFirstTasks(projectSlug: string, userId: string | null): Promise<OpenFirstTask[]> {
  const cards = await prisma.kanbanCard.findMany({
    where: { projectSlug, openToPublic: true, assigneeId: null, column: { not: "DONE" }, source: { not: "github" } },
    orderBy: [{ updatedAt: "desc" }],
    take: 6,
    select: {
      id: true, title: true, priority: true, lockedTokenValue: true,
      firstTaskWhy: true, firstTaskTime: true, firstTaskPlace: true, firstTaskChoose: true, firstTaskQuestion: true, firstTaskMaxOffers: true,
      taskOffers: { where: { status: "PENDING" }, select: { userId: true } },
    },
  });
  const mine = userId
    ? await prisma.taskOffer.findMany({ where: { userId, cardId: { in: cards.map((c) => c.id) } }, select: { cardId: true, status: true } })
    : [];
  const myByCard = new Map(mine.map((o) => [o.cardId, o.status]));
  return cards.map((c) => ({
    id: c.id,
    title: c.title,
    why: c.firstTaskWhy,
    time: c.firstTaskTime,
    place: c.firstTaskPlace,
    choose: c.firstTaskChoose,
    question: c.firstTaskQuestion,
    tokens: c.lockedTokenValue ?? getPriorityTokenValue(c.priority),
    full: offersFull(c, c.taskOffers.length),
    myOffer: myByCard.get(c.id) ?? null,
  }));
}

// True when this account may not take on another first task right now (#294).
export async function atNewAccountCap(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
  if (!user || !isNewAccount(user.createdAt)) return false;
  const [offers, taken] = await Promise.all([
    prisma.taskOffer.count({ where: { userId, status: "PENDING" } }),
    prisma.kanbanCard.count({ where: { assigneeId: userId, openToPublic: true, column: { not: "DONE" } } }),
  ]);
  return newAccountCapReached(user.createdAt, offers + taken);
}

export type TrackRecord = { tasksDone: number; projects: number; thanked: number; since: Date };

// What someone has actually done on GoodTribes, for a lead choosing among
// sign-ups: cards they finished, in how many projects, and thanks received.
// Deliberately no ratings.
export async function getTrackRecords(userIds: string[]): Promise<Map<string, TrackRecord>> {
  if (userIds.length === 0) return new Map();
  const [done, kudos, users] = await Promise.all([
    prisma.kanbanCard.findMany({ where: { assigneeId: { in: userIds }, column: "DONE" }, select: { assigneeId: true, projectSlug: true } }),
    prisma.kudos.groupBy({ by: ["toUserId"], where: { toUserId: { in: userIds } }, _count: { _all: true } }),
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, createdAt: true } }),
  ]);
  const out = new Map<string, TrackRecord>();
  for (const u of users) {
    const mine = done.filter((d) => d.assigneeId === u.id);
    out.set(u.id, {
      tasksDone: mine.length,
      projects: new Set(mine.map((d) => d.projectSlug)).size,
      thanked: kudos.find((k) => k.toUserId === u.id)?._count._all ?? 0,
      since: u.createdAt,
    });
  }
  return out;
}

// ─── Finding first tasks across projects (#279) ─────────────────────────────

export type FirstTaskFilters = {
  q: string | null;
  sdg: number | null;
  form: "nonprofit" | "commercial" | null;
  phase: "IDEA" | "PILOT" | "PRODUCTION" | "ESTABLISH" | "SCALE" | "IMPACT" | null;
  time: "short" | "recurring" | null;
  place: "remote" | "onsite" | null;
};

const PHASE_FILTERS = ["IDEA", "PILOT", "PRODUCTION", "ESTABLISH", "SCALE", "IMPACT"] as const;
const COMMERCIAL_TYPES = ["COMMERCIAL_UMBRELLA", "COMMERCIAL_AB"] as const;

// From the URL, so rebuilt value by value.
export function parseFirstTaskFilters(sp: Record<string, string | string[] | undefined>): FirstTaskFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);
  const sdg = Number(one("sdg"));
  const pick = <T extends string>(v: string | null, allowed: readonly T[]) => (allowed as readonly string[]).includes(v ?? "") ? (v as T) : null;
  return {
    q: one("q")?.trim().slice(0, 100) || null,
    sdg: Number.isInteger(sdg) && sdg >= 1 && sdg <= 17 ? sdg : null,
    form: pick(one("form"), ["nonprofit", "commercial"] as const),
    phase: pick(one("phase"), PHASE_FILTERS),
    time: pick(one("time"), ["short", "recurring"] as const),
    place: pick(one("place"), ["remote", "onsite"] as const),
  };
}

export type FirstTaskListItem = {
  id: string;
  title: string;
  why: string | null;
  time: FirstTaskTime | null;
  place: string | null;
  choose: boolean;
  tokens: number;
  project: { slug: string; title: string; sdgGoals: number[]; commercial: boolean; phase: string };
  founder: { name: string | null; image: string | null };
};

// onlyProjectIds: the evening's dreams (#281); notOwnedBy: not your own.
export type FirstTaskScope = { onlyProjectIds?: string[]; notOwnedBy?: string | null };

function firstTaskWhere(f: FirstTaskFilters, scope: FirstTaskScope = {}): Prisma.KanbanCardWhereInput {
  const project: Prisma.ProjectWhereInput = {
    ...PUBLIC_PROJECT_WHERE,
    ...(scope.onlyProjectIds ? { id: { in: scope.onlyProjectIds } } : {}),
    ...(scope.notOwnedBy ? { ownerId: { not: scope.notOwnedBy } } : {}),
    ...(f.sdg ? { sdgGoals: { has: f.sdg } } : {}),
    ...(f.form === "commercial" ? { legalType: { in: [...COMMERCIAL_TYPES] } } : f.form === "nonprofit" ? { legalType: { notIn: [...COMMERCIAL_TYPES] } } : {}),
    // The Idé step on screen is IDEA and SPRINT together (lib/projectPhase.ts).
    ...(f.phase === "IDEA" ? { phase: { in: ["IDEA", "SPRINT"] } } : f.phase ? { phase: f.phase } : {}),
  };
  return {
    openToPublic: true,
    assigneeId: null,
    column: { not: "DONE" },
    source: { not: "github" },
    project,
    ...(f.time === "short" ? { firstTaskTime: { in: ["MIN15", "HOUR1"] } } : f.time === "recurring" ? { firstTaskTime: "RECURRING" } : {}),
    ...(f.place === "remote" ? { firstTaskPlace: null } : f.place === "onsite" ? { firstTaskPlace: { not: null } } : {}),
    ...(f.q
      ? {
          OR: [
            { title: { contains: f.q, mode: "insensitive" } },
            { firstTaskWhy: { contains: f.q, mode: "insensitive" } },
            { firstTaskPlace: { contains: f.q, mode: "insensitive" } },
            { project: { title: { contains: f.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export async function searchFirstTasks(f: FirstTaskFilters, page: { take: number; skip?: number }, scope: FirstTaskScope = {}): Promise<{ total: number; items: FirstTaskListItem[] }> {
  const where = firstTaskWhere(f, scope);
  const [total, cards] = await Promise.all([
    prisma.kanbanCard.count({ where }),
    prisma.kanbanCard.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: page.take,
      skip: page.skip ?? 0,
      select: {
        id: true, title: true, priority: true, lockedTokenValue: true,
        firstTaskWhy: true, firstTaskTime: true, firstTaskPlace: true, firstTaskChoose: true,
        project: { select: { slug: true, title: true, sdgGoals: true, legalType: true, phase: true, owner: { select: { name: true, image: true } } } },
      },
    }),
  ]);
  return {
    total,
    items: cards.map((c) => ({
      id: c.id,
      title: c.title,
      why: c.firstTaskWhy,
      time: c.firstTaskTime,
      place: c.firstTaskPlace,
      choose: c.firstTaskChoose,
      tokens: c.lockedTokenValue ?? getPriorityTokenValue(c.priority),
      project: {
        slug: c.project.slug, title: c.project.title, sdgGoals: c.project.sdgGoals,
        commercial: (COMMERCIAL_TYPES as readonly string[]).includes(c.project.legalType), phase: c.project.phase,
      },
      founder: { name: c.project.owner.name, image: c.project.owner.image },
    })),
  };
}

// The global goals that open first tasks are about, for the filter row.
export async function firstTaskSdgs(): Promise<number[]> {
  const rows = await prisma.project.findMany({
    where: { ...PUBLIC_PROJECT_WHERE, kanbanCards: { some: { openToPublic: true, assigneeId: null, column: { not: "DONE" } } } },
    select: { sdgGoals: true },
  });
  return [...new Set(rows.flatMap((r) => r.sdgGoals))].sort((a, b) => a - b);
}

export type HelperToInvite = { userId: string; name: string | null; image: string | null; tasks: string[] };

// Helpers who finished a first task (in Done) and aren't on the team yet —
// for "Bjud in till teamet?" on the members page (#284). Followers count as
// not on the team: taking a first task makes you one.
export async function getHelpersToInvite(projectId: string, projectSlug: string): Promise<HelperToInvite[]> {
  const [cards, team] = await Promise.all([
    prisma.kanbanCard.findMany({
      where: { projectSlug, openToPublic: true, column: "DONE", assigneeId: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: { title: true, assignee: { select: { id: true, name: true, image: true } } },
    }),
    prisma.projectMember.findMany({ where: { projectId, NOT: { role: "FOLLOWER" } }, select: { userId: true } }),
  ]);
  const onTeam = new Set(team.map((m) => m.userId));
  const byUser = new Map<string, HelperToInvite>();
  for (const c of cards) {
    if (!c.assignee || onTeam.has(c.assignee.id)) continue;
    const h = byUser.get(c.assignee.id) ?? { userId: c.assignee.id, name: c.assignee.name, image: c.assignee.image, tasks: [] };
    h.tasks.push(c.title);
    byUser.set(c.assignee.id, h);
  }
  return [...byUser.values()];
}

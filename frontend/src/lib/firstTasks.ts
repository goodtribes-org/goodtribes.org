import type { FirstTaskTime } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPriorityTokenValue } from "@/lib/priorityTokens";

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

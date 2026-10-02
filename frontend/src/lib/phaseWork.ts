import type { PhaseGateOutcome, Prisma, ProjectPhase } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DISPLAY_PHASES, getChecklistForPhase, getNextPhase, toDisplayPhase } from "@/lib/projectPhase";

// The work behind a phase: kanban cards tagged with the phase (and step)
// they belong to. A phase's documents can be filled in minutes — with AI
// even faster — so a gate also shows how much of the phase's actual work
// is done. Shown and recorded, never enforced (same as gate criteria).

export type CardPhase = Exclude<ProjectPhase, "SPRINT">;

// The phase a card is tagged with: SPRINT is merged into IDEA everywhere.
export function cardPhaseFor(phase: ProjectPhase): CardPhase {
  return toDisplayPhase(phase) as CardPhase;
}

// The stored phases a display phase covers (IDEA also matches SPRINT, in
// case a raw value ever slips through).
function storedPhases(phase: CardPhase): ProjectPhase[] {
  return phase === "IDEA" ? ["IDEA", "SPRINT"] : [phase];
}

export function stepKeysFor(phase: ProjectPhase): string[] {
  return getChecklistForPhase(phase).map((i) => i.key);
}

export function isStepOf(phase: ProjectPhase, stepKey: string | null | undefined): stepKey is string {
  return !!stepKey && stepKeysFor(phase).includes(stepKey);
}

export type CardStep = { phase: string | null; stepKey: string | null };

// A phase/step picked in the card editor, as stored columns: an unknown
// phase means no phase, and a step only sticks if it belongs to the phase.
export function validCardStep(step: CardStep | null): { phase: CardPhase | null; stepKey: string | null } {
  const phase = DISPLAY_PHASES.find((p) => p.value === step?.phase)?.value as CardPhase | undefined;
  if (!phase) return { phase: null, stepKey: null };
  return { phase, stepKey: isStepOf(phase, step?.stepKey) ? step!.stepKey : null };
}

// Cards a gate decision creates are work for the phase the project is in
// afterwards: the next one on CONTINUE, otherwise the same one.
export function cardPhaseAfterGate(fromPhase: ProjectPhase, decision: PhaseGateOutcome): CardPhase {
  const current = cardPhaseFor(fromPhase);
  if (decision !== "CONTINUE") return current;
  const next = getNextPhase(current);
  return next ? cardPhaseFor(next) : current;
}

// Wishlist (BACKLOG) is ideas, not committed work — counted on its own.
const OPEN_COLUMNS = ["TODO", "DOING", "REVIEW"];

export type PhaseWork = {
  done: number;
  open: number;
  wishlist: number;
  // Open cards for this phase, oldest first (a few — the board has the rest).
  openCards: { id: string; title: string; column: string; stepKey: string | null }[];
  // Open cards from earlier phases that are still not done.
  earlierOpen: number;
  // Open cards on the board not tied to any phase (older cards).
  untagged: number;
};

const OPEN_CARDS_SHOWN = 6;

export async function getPhaseWork(projectSlug: string, rawPhase: ProjectPhase): Promise<PhaseWork> {
  const phase = cardPhaseFor(rawPhase);
  const order = DISPLAY_PHASES.map((p) => p.value as CardPhase);
  const earlier = order.slice(0, order.indexOf(phase)).flatMap(storedPhases);
  const base = { projectSlug, source: { not: "github" } };
  const [byColumn, openCards, earlierOpen, untagged] = await Promise.all([
    prisma.kanbanCard.groupBy({ by: ["column"], where: { ...base, phase: { in: storedPhases(phase) } }, _count: { _all: true } }),
    prisma.kanbanCard.findMany({
      where: { ...base, phase: { in: storedPhases(phase) }, column: { in: OPEN_COLUMNS } },
      orderBy: { createdAt: "asc" },
      take: OPEN_CARDS_SHOWN,
      select: { id: true, title: true, column: true, stepKey: true },
    }),
    earlier.length ? prisma.kanbanCard.count({ where: { ...base, phase: { in: earlier }, column: { in: OPEN_COLUMNS } } }) : 0,
    prisma.kanbanCard.count({ where: { ...base, phase: null, column: { in: OPEN_COLUMNS } } }),
  ]);
  const count = (cols: string[]) => byColumn.filter((r) => cols.includes(r.column)).reduce((n, r) => n + r._count._all, 0);
  return { done: count(["DONE"]), open: count(OPEN_COLUMNS), wishlist: count(["BACKLOG"]), openCards, earlierOpen, untagged };
}

// For the phase bars: per phase, how many of its committed cards (not
// wishlist) are done. One query for all phases.
export type PhaseCardCount = { done: number; total: number };

export async function getPhaseCardCounts(projectSlug: string): Promise<Partial<Record<CardPhase, PhaseCardCount>>> {
  const rows = await prisma.kanbanCard.groupBy({
    by: ["phase", "column"],
    where: { projectSlug, source: { not: "github" }, phase: { not: null }, column: { in: [...OPEN_COLUMNS, "DONE"] } },
    _count: { _all: true },
  });
  const counts: Partial<Record<CardPhase, PhaseCardCount>> = {};
  for (const r of rows) {
    if (!r.phase) continue;
    const c = (counts[cardPhaseFor(r.phase)] ??= { done: 0, total: 0 });
    c.total += r._count._all;
    if (r.column === "DONE") c.done += r._count._all;
  }
  return counts;
}

// For the gate decision record: open cards for the phase being decided.
export async function countOpenPhaseTasks(tx: Prisma.TransactionClient, projectSlug: string, rawPhase: ProjectPhase): Promise<number> {
  return tx.kanbanCard.count({
    where: { projectSlug, source: { not: "github" }, phase: { in: storedPhases(cardPhaseFor(rawPhase)) }, column: { in: OPEN_COLUMNS } },
  });
}

// For the gate UI: open cards with their step's label (resolved on the server).
export function gateWork(work: PhaseWork, stepLabel: (key: string) => string) {
  return { ...work, openCards: work.openCards.map((c) => ({ ...c, stepLabel: c.stepKey ? stepLabel(c.stepKey) : null })) };
}

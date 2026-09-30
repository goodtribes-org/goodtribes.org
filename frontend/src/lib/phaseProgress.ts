import { DISPLAY_PHASES, getChecklistForPhase, toDisplayPhase, type ProjectPhaseValue } from "@/lib/projectPhase";

// How far a project has come in each phase — what fills the phase bars
// (docs/plans/fasframsteg-och-overblick.md). A checklist task counts as
// done when a human ticked it OR when the project's own data shows it's
// done ("minst 3 loggade intervjuer"), so the bars follow the actual work,
// not just the checkboxes. Pure: the signals are fetched by
// lib/projectSignals.ts. Progress is an overview, never a lock — the phase
// gates stay advisory.

export type ProjectSignals = {
  dreamConfirmed: boolean;
  hasSummaryAndDescription: boolean;
  sdgCount: number;
  // Members who aren't just followers.
  activeMemberCount: number;
  inviteCount: number;
  leanCanvasFilled: number;
  valuePropositionFilled: number;
  interviewCount: number;
  marketScanCount: number;
  kanbanCardCount: number;
  sprintCount: number;
  // Design-sprint steps (SprintPhaseName) closed in any sprint.
  closedSprintSteps: string[];
  fundingNeedSet: boolean;
};

// Thresholds: enough that the step is meaningfully done, low enough that a
// real start already counts. Interviews match the Idé gate (MIN_INTERVIEWS
// in lib/phaseGate.ts, kept in sync by the test).
export const MIN_LEAN_CANVAS_BLOCKS = 6; // of 11
export const MIN_VALUE_PROPOSITION_FIELDS = 4; // of 6
export const MIN_INTERVIEWS = 3;
export const MIN_KANBAN_CARDS = 3;

const SPRINT_STEP_KEYS: Record<string, string> = {
  UNDERSTAND: "map_understand",
  DIVERGE: "sketch_solutions",
  DECIDE: "decide_plan",
  PROTOTYPE: "build_prototype",
  VALIDATE: "test_with_users",
};

// Idé and Uppstart first; later phases keep their manual ticks until their
// signals are added the same way.
export function autoDoneKeys(s: ProjectSignals): string[] {
  const done: string[] = [];
  const add = (key: string, cond: boolean) => cond && done.push(key);
  add("dream_defined", s.dreamConfirmed || s.hasSummaryAndDescription);
  add("ai_reviewed", s.sdgCount > 0);
  add("peer_feedback_requested", s.activeMemberCount >= 2 || s.inviteCount > 0);
  add("lean_canvas_created", s.leanCanvasFilled >= MIN_LEAN_CANVAS_BLOCKS);
  add("value_proposition_created", s.valuePropositionFilled >= MIN_VALUE_PROPOSITION_FIELDS);
  add("target_audience_interviews", s.interviewCount >= MIN_INTERVIEWS);
  add("market_scan_partners", s.marketScanCount > 0);
  add("core_team_formed", s.activeMemberCount >= 2);
  add("kanban_seeded", s.kanbanCardCount >= MIN_KANBAN_CARDS);
  add("sprint_prepped", s.sprintCount > 0);
  for (const step of s.closedSprintSteps) if (SPRINT_STEP_KEYS[step]) done.push(SPRINT_STEP_KEYS[step]);
  add("rough_budget_estimated", s.fundingNeedSet);
  return done;
}

export type PhaseProgress = {
  phase: Exclude<ProjectPhaseValue, "SPRINT">;
  done: number;
  total: number;
  pct: number;
  complete: boolean;
};

export function phaseProgress(doneKeys: ReadonlySet<string>): PhaseProgress[] {
  return DISPLAY_PHASES.map((p) => {
    const items = getChecklistForPhase(p.value) ?? [];
    const done = items.filter((i) => doneKeys.has(i.key)).length;
    const total = items.length;
    return { phase: p.value, done, total, pct: total ? Math.round((done / total) * 100) : 0, complete: total > 0 && done === total };
  });
}

// "Nästa steg": the first unfinished task, in checklist order, of the phase
// the project is in. A parent step (Design Sprint) is skipped while its own
// sub-steps are what's left, so the line names something concrete to do.
export function nextStep(phase: ProjectPhaseValue, doneKeys: ReadonlySet<string>): { key: string; href?: string } | null {
  const items = getChecklistForPhase(toDisplayPhase(phase)) ?? [];
  for (const item of items) {
    if (doneKeys.has(item.key)) continue;
    const hasOpenSubSteps = items.some((i) => i.parentKey === item.key && !doneKeys.has(i.key));
    if (hasOpenSubSteps) continue;
    return { key: item.key, href: item.href };
  }
  return null;
}

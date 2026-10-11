import { UPPSTART_STEPS, type UppstartStep } from "@/lib/mvp";
import { LANSERING_STEPS, MIN_PILOT_LOG_ENTRIES, type LanseringStep } from "@/lib/pilot";
import { ETABLERA_STEPS, type EtableraStep } from "@/lib/establish";
import { DISPLAY_PHASES, getChecklistForPhase, overviewPathFor, toDisplayPhase, type ProjectPhaseValue } from "@/lib/projectPhase";

// How far a project has come in each phase — what fills the phase bars
// (docs/plans/fasframsteg-och-overblick.md). A checklist task counts as
// done when a human ticked it OR when the project's own data shows it's
// done ("minst 3 loggade intervjuer"), so the bars follow the actual work,
// not just the checkboxes. Pure: the signals are fetched by
// lib/projectSignals.ts. Progress is an overview, never a lock — the phase
// gates stay advisory.

export type ProjectSignals = {
  // Idé steps with a card waiting in Granskas (#271): the AI (or someone)
  // did the work, a lead hasn't approved it yet — so not done, however full
  // the canvas looks.
  ideaStepsInReview?: string[];
  dreamConfirmed: boolean;
  hasSummaryAndDescription: boolean;
  sdgCount: number;
  leanCanvasFilled: number;
  // How many of the impact model's own links are filled (IMPACT_MODEL_FIELDS).
  impactModelFilled: number;
  impactModelFields: number;
  valuePropositionFilled: number;
  interviewCount: number;
  marketScanCount: number;
  // Uppstart (#320, same data as uppstartGateCriteria — lib/mvp.ts)
  uppstartDone: Record<UppstartStep, boolean>;
  // Lansering (#327, same data as lanseringGateCriteria — lib/pilot.ts)
  lanseringDone: Record<LanseringStep, boolean>;
  pilotGateDecided: boolean;
  // Etablera (#329, same data as etableraGateCriteria — lib/establish.ts)
  etableraDone: Record<EtableraStep, boolean>;
  // Skala (same data as skalaGateCriteria)
  replicationOpened: boolean;
  scalingGoalsWritten: boolean;
  geographiesWritten: boolean;
  fundingAwarded: boolean;
  approvedInstance: boolean;
  // Impact
  deliveredReports: number;
  verifiedDeliveredReports: number;
  celebrationWritten: boolean;
};

// Thresholds: enough that the step is meaningfully done, low enough that a
// real start already counts. Interviews match the Idé gate (MIN_INTERVIEWS
// in lib/phaseGate.ts, kept in sync by the test).
export const MIN_LEAN_CANVAS_BLOCKS = 6; // of 11
export const MIN_VALUE_PROPOSITION_FIELDS = 4; // of 6
export const MIN_INTERVIEWS = 3;
// Match MIN_LOG_ENTRIES in lib/phaseGate.ts (the test keeps them in sync) —
// the bars and the gates must never disagree.
export const MIN_LOG_ENTRIES = MIN_PILOT_LOG_ENTRIES;


// Every phase. For Uppstart → Skala the rules are the same ones the phase
// gates already use (lib/phaseGate.ts's *GateCriteria), so a bar and its
// gate always agree. What no data can show (e.g. "Bygga upp en stabil
// supporterbas") stays a manual tick.
export function autoDoneKeys(s: ProjectSignals): string[] {
  const done: string[] = [];
  const add = (key: string, cond: boolean) => cond && done.push(key);
  add("dream_defined", s.dreamConfirmed || s.hasSummaryAndDescription);
  add("ai_reviewed", s.sdgCount > 0);
  add("lean_canvas_created", s.leanCanvasFilled >= MIN_LEAN_CANVAS_BLOCKS);
  add("value_proposition_created", s.valuePropositionFilled >= MIN_VALUE_PROPOSITION_FIELDS);
  add("impact_model_created", s.impactModelFields > 0 && s.impactModelFilled >= s.impactModelFields);
  add("target_audience_interviews", s.interviewCount >= MIN_INTERVIEWS);
  add("market_scan_partners", s.marketScanCount > 0);
  // Uppstart (#320), as in uppstartGateCriteria (lib/mvp.ts)
  for (const step of UPPSTART_STEPS) add(step, s.uppstartDone[step]);
  // Lansering (#327), as in lanseringGateCriteria (lib/pilot.ts); the
  // old go/no-go key still follows the gate decision for older ticks.
  for (const step of LANSERING_STEPS) add(step, s.lanseringDone[step]);
  add("pilot_go_no_go", s.pilotGateDecided);

  // Etablera (#329), as in etableraGateCriteria (lib/establish.ts)
  for (const step of ETABLERA_STEPS) add(step, s.etableraDone[step]);
  // Skala, as in skalaGateCriteria
  add("scale_vs_fork_decided", s.replicationOpened);
  add("scaling_goals_set", s.scalingGoalsWritten);
  add("new_geographies_identified", s.geographiesWritten);
  add("expansion_capital_secured", s.fundingAwarded);
  add("local_teams_or_license", s.approvedInstance);
  // Impact: only DELIVERED reports count — a grant received is support in,
  // not impact out (see CLAUDE.md's impact-measurement note).
  add("sdg_impact_measured", s.deliveredReports > 0);
  add("impact_externally_verified", s.verifiedDeliveredReports > 0);
  add("results_celebrated", s.celebrationWritten);
  // An Idé step whose card waits in Granskas isn't done until a lead
  // approves it (moveKanbanCard → markStepDoneIfCardsDone ticks it then).
  const waiting = new Set(s.ideaStepsInReview ?? []);
  return [...new Set(done)].filter((k) => !waiting.has(k));
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

// The phase bars are split into one segment per main step. A step with
// sub-steps (Design Sprint in Uppstart, "Säkra finansiering" in Etablera) is
// one segment that fills as its sub-steps get done, so the count reads
// "1/5 steg" rather than mixing steps and sub-steps. A step is done when it
// was ticked itself or when all its sub-steps are.
export type PhaseStep = { key: string; frac: number; done: boolean; subDone: number; subTotal: number };

export type PhaseStepProgress = PhaseProgress & { steps: PhaseStep[] };

export function phaseSteps(phase: ProjectPhaseValue, doneKeys: ReadonlySet<string>): PhaseStep[] {
  const items = getChecklistForPhase(phase) ?? [];
  return items
    .filter((i) => !i.parentKey)
    .map((i) => {
      const subs = items.filter((s) => s.parentKey === i.key);
      const subDone = subs.filter((s) => doneKeys.has(s.key)).length;
      const done = doneKeys.has(i.key) || (subs.length > 0 && subDone === subs.length);
      const frac = done ? 1 : subs.length ? subDone / subs.length : 0;
      return { key: i.key, frac, done, subDone, subTotal: subs.length };
    });
}

// Same shape as phaseProgress, counted in steps (see phaseSteps).
export function phaseStepProgress(doneKeys: ReadonlySet<string>): PhaseStepProgress[] {
  return DISPLAY_PHASES.map((p) => {
    const steps = phaseSteps(p.value, doneKeys);
    const done = steps.filter((s) => s.done).length;
    const total = steps.length;
    const filled = steps.reduce((sum, s) => sum + s.frac, 0);
    return { phase: p.value, done, total, pct: total ? Math.round((filled / total) * 100) : 0, complete: total > 0 && done === total, steps };
  });
}

// A phase is finished when all its steps are done and none of its kanban
// cards (lib/phaseWork.ts's getPhaseCardCounts) is still open: its bar then
// turns solid and its circle shows ✓. Without card counts, steps alone.
export function isPhaseFinished(progress: Pick<PhaseProgress, "complete">, cards?: { done: number; total: number }): boolean {
  return progress.complete && (!cards || cards.done === cards.total);
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

// Where "Nästa steg" (or any checklist step) is done. Every Idé step lives
// on the one Idé phase page since 2026-10-03 (#206), and every Uppstart step
// on the Uppstart page (#320), so it goes there, never
// to the step's old standalone page (an Idé item's href, e.g. "lean-canvas",
// is only for the legacy guide). Later phases: the step's own page, or the
// phase page (#309; it used to be the legacy guide).
// Phases whose page shows one step at a time (?step=<key>): Idé (#206),
// Uppstart (#320), Lansering (#327) and Etablera (#329). Their steps link to
// the step on the phase page.
export const STEP_PAGES: Partial<Record<ProjectPhaseValue, string>> = { IDEA: "ide", PILOT: "uppstart", PRODUCTION: "lansering", ESTABLISH: "etablera" };

export function stepHref(slug: string, phase: ProjectPhaseValue, step: { key: string; href?: string }): string {
  const display = toDisplayPhase(phase);
  const stepPage = STEP_PAGES[display];
  if (stepPage) return `/projects/${slug}/${stepPage}?step=${step.key}`;
  if (step.href) return `/projects/${slug}/${step.href}`;
  return `/projects/${slug}/${overviewPathFor(display)}`;
}

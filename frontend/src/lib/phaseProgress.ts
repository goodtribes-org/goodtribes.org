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
  // Uppstart (same data as uppstartGateCriteria)
  testFeedbackCount: number;
  allRolesFilled: boolean;
  // Lansering (same data as lanseringGateCriteria)
  pilotSuccessCriteria: boolean;
  pilotLogEntries: number;
  pilotResultsSummary: boolean;
  pilotGateDecided: boolean;
  impactMetricCount: number;
  launchPlanWritten: boolean;
  workflowsPage: boolean;
  // Etablera (same data as etableraGateCriteria)
  fundingApplied: boolean;
  fundingSecured: boolean;
  activePartnerships: number;
  playbookPage: boolean;
  councilReviewCompleted: boolean;
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
export const MIN_KANBAN_CARDS = 3;
// Match MIN_TEST_FEEDBACK / MIN_LOG_ENTRIES in lib/phaseGate.ts (the test
// keeps them in sync) — the bars and the gates must never disagree.
export const MIN_TEST_FEEDBACK = 3;
export const MIN_LOG_ENTRIES = 3;

const SPRINT_STEP_KEYS: Record<string, string> = {
  UNDERSTAND: "map_understand",
  DIVERGE: "sketch_solutions",
  DECIDE: "decide_plan",
  PROTOTYPE: "build_prototype",
  VALIDATE: "test_with_users",
};

// Every phase. For Uppstart → Skala the rules are the same ones the phase
// gates already use (lib/phaseGate.ts's *GateCriteria), so a bar and its
// gate always agree. What no data can show (e.g. "Bygga upp en stabil
// supporterbas") stays a manual tick.
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
  // Uppstart, as in uppstartGateCriteria
  add("test_with_users", s.testFeedbackCount >= MIN_TEST_FEEDBACK);
  add("core_team_formed", s.allRolesFilled);
  // Lansering, as in lanseringGateCriteria (+ the go/no-go decision itself)
  add("pilot_success_criteria", s.pilotSuccessCriteria);
  add("pilot_executed_documented", s.pilotLogEntries >= MIN_LOG_ENTRIES);
  add("pilot_results_collected", s.pilotResultsSummary);
  add("pilot_go_no_go", s.pilotGateDecided);
  add("impact_measurement_setup", s.impactMetricCount > 0);
  add("launch_marketing_plan_created", s.launchPlanWritten);
  add("workflows_formalized", s.workflowsPage);
  // Etablera, as in etableraGateCriteria
  add("stable_operations_funding", s.fundingApplied);
  add("funding_secured", s.fundingSecured);
  add("partnerships_formalized", s.activePartnerships > 0);
  add("playbook_documented", s.playbookPage);
  add("review_council_deep_review", s.councilReviewCompleted);
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
  return [...new Set(done)];
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

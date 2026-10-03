import { autoDoneKeys, MIN_INTERVIEWS, MIN_LOG_ENTRIES, MIN_TEST_FEEDBACK, isPhaseFinished, nextStep, phaseProgress, phaseStepProgress, phaseSteps, type ProjectSignals } from "../lib/phaseProgress";
import { MIN_INTERVIEWS as GATE_MIN_INTERVIEWS, MIN_LOG_ENTRIES as GATE_MIN_LOG, MIN_TEST_FEEDBACK as GATE_MIN_FEEDBACK } from "../lib/phaseGate";

jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/aiMode", () => ({ getAiClientFor: jest.fn() }));

const none: ProjectSignals = {
  dreamConfirmed: false,
  hasSummaryAndDescription: false,
  sdgCount: 0,
  activeMemberCount: 1,
  inviteCount: 0,
  leanCanvasFilled: 0,
  impactModelFilled: 0,
  impactModelFields: 6,
  valuePropositionFilled: 0,
  interviewCount: 0,
  marketScanCount: 0,
  kanbanCardCount: 0,
  sprintCount: 0,
  closedSprintSteps: [],
  fundingNeedSet: false,
  testFeedbackCount: 0,
  allRolesFilled: false,
  pilotSuccessCriteria: false,
  pilotLogEntries: 0,
  pilotResultsSummary: false,
  pilotGateDecided: false,
  impactMetricCount: 0,
  launchPlanWritten: false,
  workflowsPage: false,
  fundingApplied: false,
  fundingSecured: false,
  activePartnerships: 0,
  playbookPage: false,
  councilReviewCompleted: false,
  replicationOpened: false,
  scalingGoalsWritten: false,
  geographiesWritten: false,
  fundingAwarded: false,
  approvedInstance: false,
  deliveredReports: 0,
  verifiedDeliveredReports: 0,
  celebrationWritten: false,
};

describe("phaseProgress", () => {
  it("a fresh project has nothing done automatically", () => {
    expect(autoDoneKeys(none)).toEqual([]);
  });

  it("marks tasks done from the project's own data, at the thresholds", () => {
    const keys = autoDoneKeys({
      ...none,
      dreamConfirmed: true,
      sdgCount: 2,
      inviteCount: 1,
      leanCanvasFilled: 6,
      valuePropositionFilled: 3,
      interviewCount: 3,
      marketScanCount: 1,
      kanbanCardCount: 2,
      sprintCount: 1,
      closedSprintSteps: ["UNDERSTAND", "DIVERGE"],
      fundingNeedSet: true,
    });
    expect(keys).toEqual(
      expect.arrayContaining([
        "dream_defined",
        "ai_reviewed",
        "peer_feedback_requested",
        "lean_canvas_created",
        "target_audience_interviews",
        "market_scan_partners",
        "sprint_prepped",
        "map_understand",
        "sketch_solutions",
        "rough_budget_estimated",
      ]),
    );
    // Below threshold: 3 of 6 VP fields, 2 kanban cards; one member isn't a team.
    expect(keys).not.toContain("value_proposition_created");
    expect(keys).not.toContain("kanban_seeded");
    expect(keys).not.toContain("core_team_formed");
  });

  it("uses the same thresholds as the phase gates", () => {
    expect(MIN_INTERVIEWS).toBe(GATE_MIN_INTERVIEWS);
    expect(MIN_TEST_FEEDBACK).toBe(GATE_MIN_FEEDBACK);
    expect(MIN_LOG_ENTRIES).toBe(GATE_MIN_LOG);
  });

  it("later phases: marks tasks from the same data the gates use", () => {
    const keys = autoDoneKeys({
      ...none,
      testFeedbackCount: 3,
      allRolesFilled: true,
      pilotSuccessCriteria: true,
      pilotLogEntries: 2,
      pilotGateDecided: true,
      impactMetricCount: 1,
      fundingApplied: true,
      activePartnerships: 1,
      scalingGoalsWritten: true,
      deliveredReports: 1,
      verifiedDeliveredReports: 0,
    });
    expect(keys).toEqual(
      expect.arrayContaining([
        "test_with_users",
        "core_team_formed",
        "pilot_success_criteria",
        "pilot_go_no_go",
        "impact_measurement_setup",
        "stable_operations_funding",
        "partnerships_formalized",
        "scaling_goals_set",
        "sdg_impact_measured",
      ]),
    );
    // 2 log entries < 3; applied isn't secured; a report isn't verified.
    expect(keys).not.toContain("pilot_executed_documented");
    expect(keys).not.toContain("funding_secured");
    expect(keys).not.toContain("impact_externally_verified");
    // No key is listed twice (core_team_formed has two signals).
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("computes done/total/pct per display phase", () => {
    const p = phaseProgress(new Set(["dream_defined", "ai_reviewed"]));
    expect(p.map((x) => x.phase)).toEqual(["IDEA", "PILOT", "PRODUCTION", "ESTABLISH", "SCALE", "IMPACT"]);
    expect(p[0]).toMatchObject({ done: 2, total: 7, pct: 29, complete: false });
    expect(p[1]).toMatchObject({ done: 0, complete: false });
  });

  it("a phase is complete when every task is done", () => {
    const idea = ["dream_defined", "lean_canvas_created", "value_proposition_created", "impact_model_created", "ai_reviewed", "target_audience_interviews", "market_scan_partners"];
    expect(phaseProgress(new Set(idea))[0]).toMatchObject({ pct: 100, complete: true });
  });

  it("next step is the first open task of the current phase", () => {
    expect(nextStep("IDEA", new Set())?.key).toBe("dream_defined");
    expect(nextStep("SPRINT", new Set(["dream_defined"]))?.key).toBe("lean_canvas_created");
    expect(nextStep("IDEA", new Set(["dream_defined", "lean_canvas_created", "value_proposition_created", "impact_model_created", "ai_reviewed", "target_audience_interviews", "market_scan_partners"]))).toBeNull();
  });

  it("skips a parent step while its sub-steps are what's left", () => {
    const done = new Set(["core_team_formed"]);
    expect(nextStep("PILOT", done)?.key).toBe("map_understand");
  });

  it("the bars have one segment per main step, sub-steps fold into their parent", () => {
    expect(phaseStepProgress(new Set()).map((p) => p.total)).toEqual([7, 5, 7, 6, 5, 4]);
  });

  it("a step with sub-steps fills as they get done", () => {
    const sprint = phaseSteps("PILOT", new Set(["map_understand", "sketch_solutions"])).find((s) => s.key === "sprint_prepped");
    expect(sprint).toMatchObject({ done: false, frac: 0.4, subDone: 2, subTotal: 5 });
  });

  it("a step is done when ticked itself or when all its sub-steps are", () => {
    const subs = ["map_understand", "sketch_solutions", "decide_plan", "build_prototype", "test_with_users"];
    expect(phaseSteps("PILOT", new Set(subs)).find((s) => s.key === "sprint_prepped")).toMatchObject({ done: true, frac: 1 });
    expect(phaseSteps("PILOT", new Set(["sprint_prepped"])).find((s) => s.key === "sprint_prepped")).toMatchObject({ done: true, frac: 1 });
  });

  it("counts steps done and fills by fraction", () => {
    const p = phaseStepProgress(new Set(["core_team_formed", "map_understand", "sketch_solutions"]))[1];
    expect(p).toMatchObject({ done: 1, total: 5, pct: 28, complete: false });
  });

  it("a phase is finished only when its steps and its kanban cards are done", () => {
    expect(isPhaseFinished({ complete: true })).toBe(true);
    expect(isPhaseFinished({ complete: true }, { done: 3, total: 3 })).toBe(true);
    expect(isPhaseFinished({ complete: true }, { done: 2, total: 3 })).toBe(false);
    expect(isPhaseFinished({ complete: false }, { done: 3, total: 3 })).toBe(false);
  });
});

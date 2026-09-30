import { autoDoneKeys, MIN_INTERVIEWS, nextStep, phaseProgress, type ProjectSignals } from "../lib/phaseProgress";
import { MIN_INTERVIEWS as GATE_MIN_INTERVIEWS } from "../lib/phaseGate";

jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/aiMode", () => ({ getAiClientFor: jest.fn() }));

const none: ProjectSignals = {
  dreamConfirmed: false,
  hasSummaryAndDescription: false,
  sdgCount: 0,
  activeMemberCount: 1,
  inviteCount: 0,
  leanCanvasFilled: 0,
  valuePropositionFilled: 0,
  interviewCount: 0,
  marketScanCount: 0,
  kanbanCardCount: 0,
  sprintCount: 0,
  closedSprintSteps: [],
  fundingNeedSet: false,
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

  it("uses the same interview threshold as the Idé gate", () => {
    expect(MIN_INTERVIEWS).toBe(GATE_MIN_INTERVIEWS);
  });

  it("computes done/total/pct per display phase", () => {
    const p = phaseProgress(new Set(["dream_defined", "ai_reviewed"]));
    expect(p.map((x) => x.phase)).toEqual(["IDEA", "PILOT", "PRODUCTION", "ESTABLISH", "SCALE", "IMPACT"]);
    expect(p[0]).toMatchObject({ done: 2, total: 7, pct: 29, complete: false });
    expect(p[1]).toMatchObject({ done: 0, complete: false });
  });

  it("a phase is complete when every task is done", () => {
    const idea = ["dream_defined", "ai_reviewed", "peer_feedback_requested", "lean_canvas_created", "value_proposition_created", "target_audience_interviews", "market_scan_partners"];
    expect(phaseProgress(new Set(idea))[0]).toMatchObject({ pct: 100, complete: true });
  });

  it("next step is the first open task of the current phase", () => {
    expect(nextStep("IDEA", new Set())?.key).toBe("dream_defined");
    expect(nextStep("SPRINT", new Set(["dream_defined"]))?.key).toBe("ai_reviewed");
    expect(nextStep("IDEA", new Set(["dream_defined", "ai_reviewed", "peer_feedback_requested", "lean_canvas_created", "value_proposition_created", "target_audience_interviews", "market_scan_partners"]))).toBeNull();
  });

  it("skips a parent step while its sub-steps are what's left", () => {
    const done = new Set(["core_team_formed"]);
    expect(nextStep("PILOT", done)?.key).toBe("map_understand");
  });
});

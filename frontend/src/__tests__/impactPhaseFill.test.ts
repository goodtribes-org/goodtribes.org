jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/aiMode", () => ({ getAiClientFor: jest.fn() }));
jest.mock("../lib/aiParticipant", () => ({ getAiParticipantUser: jest.fn() }));

import { coerceNextStepBrief, impactModelPlanText, impactSummaryHtml, NEXT_STEP_DECISION, parseImpactStatus } from "../lib/impactPhaseFill";

describe("impact summary", () => {
  it("needs results and escapes them", () => {
    expect(impactSummaryHtml({ summary: "x" })).toBeNull();
    const html = impactSummaryHtml({ summary: "Skolmat", results: ["33 portioner <räddade>"], sdgs: ["Mål 12"] })!;
    expect(html).toContain("&lt;räddade&gt;");
    expect(html).toContain("utan egna summor");
  });
});

describe("next-step brief", () => {
  it("keeps one assessment per known option and defaults to continue", () => {
    const b = coerceNextStepBrief({
      situation: ["Två kök"],
      options: [
        { option: "replicate", assessment: "Playbooken finns" },
        { option: "replicate", assessment: "dubblett" },
        { option: "sell", assessment: "okänt" },
        { option: "close", assessment: "" },
      ],
      recommendation: "sell",
      reasons: ["x"],
    });
    expect(b.options).toEqual([{ option: "replicate", assessment: "Playbooken finns" }]);
    expect(b.recommendation).toBe("continue");
    expect(b.firstSteps).toEqual([]);
  });

  it("maps options to the stored decision", () => {
    expect(NEXT_STEP_DECISION).toEqual({ continue: "CONTINUE", replicate: "REPLICATE", close: "CLOSE_RESPONSIBLY" });
  });
});

describe("impact fill status", () => {
  it("parses its sections", () => {
    expect(parseImpactStatus({ summary: "done", plan: "done" })).toEqual({ summary: "done" });
  });
});

describe("impactModelPlanText", () => {
  it("labels the impact model as a plan, never a result, and skips empty steps", () => {
    const text = impactModelPlanText({ issue: "Plast på stränderna", activities: "  ", shortTermOutcomes: "Elever vet var plasten kommer ifrån" });
    expect(text).toContain("teamets plan, INTE resultat");
    expect(text).toContain("issue: Plast på stränderna");
    expect(text).toContain("shortTermOutcomes: Elever vet");
    expect(text).not.toContain("activities");
  });

  it("is empty without a model", () => {
    expect(impactModelPlanText(null)).toBe("");
    expect(impactModelPlanText({ issue: "" })).toBe("");
  });
});

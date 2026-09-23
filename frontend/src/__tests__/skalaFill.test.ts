jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/aiMode", () => ({ getAiClientFor: jest.fn() }));
jest.mock("../lib/aiParticipant", () => ({ getAiParticipantUser: jest.fn() }));

import { coerceScalingPlan, parseSkalaStatus, scaleChoiceHtml, SCALING_FIELDS } from "../lib/skalaFill";
import { emptyFieldsToWrite } from "../lib/phaseFill";
import { cardsForLanseringDecision, coerceGateBrief, SKALA_CARD_WORDS } from "../lib/phaseGate";

describe("Skala drafts", () => {
  it("maps the scaling plan and never overwrites", () => {
    const draft = coerceScalingPlan({ goals: "Från 1 till 3 kök", geographies: "Grannskolor", capital_plan: "", team_or_license: "Licens" });
    expect(emptyFieldsToWrite(SCALING_FIELDS, { goals: "Teamets mål", geographies: null, capitalPlan: null, teamOrLicenseModel: null }, draft)).toEqual({
      geographies: "Grannskolor",
      teamOrLicenseModel: "Licens",
    });
  });

  it("needs a recommendation for the scale-or-fork page", () => {
    expect(scaleChoiceHtml({ options: ["a"] })).toBeNull();
    expect(scaleChoiceHtml({ options: ["Växa"], recommendation: "Replikera <med playbook>" })).toContain("&lt;med playbook&gt;");
  });

  it("parses its fill status", () => {
    expect(parseSkalaStatus({ choice: "running", playbook: "done" })).toEqual({ choice: "running" });
  });
});

describe("Skala gate cards", () => {
  const brief = coerceGateBrief({ criteria: [{ criterion: "3 kök", verdict: "not_met", evidence: "" }, { criterion: "Kapital", verdict: "unclear", evidence: "" }] });
  it("follows up what's unclear and plans to reach what isn't", () => {
    expect(cardsForLanseringDecision("ADJUST", brief, SKALA_CARD_WORDS).map((c) => c.title)).toEqual(["Följ upp: Kapital"]);
    expect(cardsForLanseringDecision("PIVOT", brief, SKALA_CARD_WORDS).map((c) => c.title)).toEqual(["Nå: 3 kök"]);
  });
});

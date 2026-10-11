jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/aiMode", () => ({ getAiClientFor: jest.fn() }));
jest.mock("../lib/aiParticipant", () => ({ getAiParticipantUser: jest.fn() }));

import { coerceSupporters, fundingPlanHtml, parseEtableraStatus, partnershipsHtml, playbookHtml } from "../lib/etableraFill";
import { emptyFieldsToWrite, wikiHtml } from "../lib/phaseFill";
import { cardsForLanseringDecision, coerceGateBrief, ETABLERA_CARD_WORDS } from "../lib/phaseGate";

describe("shared fill helpers", () => {
  it("wikiHtml escapes and skips empty sections", () => {
    const html = wikiHtml([{ heading: "A & B", items: ["<x>"] }, { heading: "Tom", items: [] }], "Utkast");
    expect(html).toContain("A &amp; B");
    expect(html).toContain("&lt;x&gt;");
    expect(html).not.toContain("Tom");
  });

  it("emptyFieldsToWrite never overwrites", () => {
    expect(emptyFieldsToWrite(["a", "b"] as const, { a: "Teamets", b: " " }, { a: "AI", b: "AI 2" })).toEqual({ b: "AI 2" });
  });

  it("the people around the project come as one text (#329)", () => {
    expect(coerceSupporters({ supporters: " - Volontärer från kyrkan " })).toBe("- Volontärer från kyrkan");
    expect(coerceSupporters(null)).toBe("");
  });
});

describe("Etablera drafts", () => {
  it("need their core content", () => {
    expect(fundingPlanHtml({ next_steps: ["x"] })).toBeNull();
    expect(partnershipsHtml({ agreement: ["x"] })).toBeNull();
    expect(playbookHtml({ summary: "x" })).toBeNull();
    expect(playbookHtml({ summary: "Skolmat", steps: ["Hitta ett kök"], roles: ["Samordnare"] })).toContain("Så kommer en ny person igång");
    expect(fundingPlanHtml({ sources: ["Kommunal överenskommelse"] })).toContain("Möjliga finansieringskällor");
  });

  it("parses fill status for its sections", () => {
    expect(parseEtableraStatus({ playbook: "done", pilot: "done" })).toEqual({ playbook: "done" });
  });
});

describe("Etablera gate cards", () => {
  const brief = coerceGateBrief({
    criteria: [
      { criterion: "Återkommande finansiering", verdict: "not_met", evidence: "" },
      { criterion: "Playbook", verdict: "unclear", evidence: "" },
    ],
  });
  it("strengthens what's unclear and fixes what's missing", () => {
    expect(cardsForLanseringDecision("ADJUST", brief, ETABLERA_CARD_WORDS).map((c) => c.title)).toEqual(["Stärk: Playbook"]);
    expect(cardsForLanseringDecision("PIVOT", brief, ETABLERA_CARD_WORDS).map((c) => c.title)).toEqual(["Åtgärda: Återkommande finansiering"]);
  });
});

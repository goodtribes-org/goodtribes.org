jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/aiMode", () => ({ getAiClientFor: jest.fn() }));

import { cardsForDecision, cardsForUppstartDecision, coerceGateBrief, missingCriteria, type GateBrief } from "../lib/phaseGate";
import type { SynthesisContent } from "../lib/ideaInsights";

describe("coerceGateBrief", () => {
  it("keeps only real canvas fields, and a field that fell can't also hold", () => {
    const b = coerceGateBrief({
      believed: ["Skolkök slänger mat", ""],
      learned: ["Köken vill ha hjälp"],
      held: ["leanCanvas.problem", "leanCanvas.channels", "leanCanvas.notAField"],
      fell: ["leanCanvas.channels", "valueProposition.vpPains", "nope"],
      recommendation: "pivot",
      reasons: ["Kanalen föll"],
      next_focus: ["Testa hämtning"],
    });
    expect(b.held).toEqual(["leanCanvas.problem"]);
    expect(b.fell).toEqual(["leanCanvas.channels", "valueProposition.vpPains"]);
    expect(b.believed).toEqual(["Skolkök slänger mat"]);
    expect(b.recommendation).toBe("pivot");
    expect(b.nextFocus).toEqual(["Testa hämtning"]);
  });

  it("defaults to the cautious 'adjust' on a missing or unknown recommendation", () => {
    expect(coerceGateBrief({ recommendation: "yolo" }).recommendation).toBe("adjust");
    expect(coerceGateBrief(null)).toEqual({
      believed: [], learned: [], held: [], fell: [], recommendation: "adjust", reasons: [], nextFocus: [], unanswered: [], successCriteria: [],
    });
  });
});

describe("missingCriteria", () => {
  it("lists the unmet criteria keys", () => {
    expect(
      missingCriteria([
        { key: "dream_defined", met: true },
        { key: "target_audience_interviews", met: false },
        { key: "market_scan_partners", met: false },
      ]),
    ).toEqual(["target_audience_interviews", "market_scan_partners"]);
  });
});

describe("cardsForDecision", () => {
  const synthesis: SynthesisContent = {
    interviewCount: 3,
    learnings: [],
    verdicts: [
      { field: "leanCanvas.problem", verdict: "confirmed", reason: "", interviewIds: ["i1"] },
      { field: "leanCanvas.channels", verdict: "unclear", reason: "", interviewIds: [] },
      { field: "valueProposition.vpPains", verdict: "refuted", reason: "", interviewIds: ["i2"] },
    ],
  };
  const brief = coerceGateBrief({ fell: ["valueProposition.vpPains", "leanCanvas.revenueStreams"] }) as GateBrief;
  const label = (k: string) => k.split(".")[1];

  it("ADJUST: one card per unclear assumption", () => {
    expect(cardsForDecision("ADJUST", synthesis, brief, label).map((c) => c.title)).toEqual(["Testa antagandet: channels"]);
  });

  it("PIVOT: refuted verdicts plus what the brief says fell, without duplicates", () => {
    expect(cardsForDecision("PIVOT", synthesis, brief, label).map((c) => c.title)).toEqual([
      "Omarbeta: vpPains",
      "Omarbeta: revenueStreams",
    ]);
  });

  it("CONTINUE and PAUSE create no cards; no synthesis means no ADJUST cards", () => {
    expect(cardsForDecision("CONTINUE", synthesis, brief, label)).toEqual([]);
    expect(cardsForDecision("PAUSE", synthesis, brief, label)).toEqual([]);
    expect(cardsForDecision("ADJUST", null, null, label)).toEqual([]);
  });
});

describe("cardsForUppstartDecision", () => {
  const brief = coerceGateBrief({
    unanswered: ["Hämtar familjerna maten?", "Hämtar familjerna maten?", "Säger kostchefen ja?"],
    fell: ["leanCanvas.channels", "nope"],
    success_criteria: ["Minst 20 hämtningar på 4 veckor", 42],
  });
  const label = (k: string) => k.split(".")[1];

  it("keeps the pilot success criteria as strings", () => {
    expect(brief.successCriteria).toEqual(["Minst 20 hämtningar på 4 veckor"]);
  });

  it("ADJUST: one card per unanswered sprint question, without duplicates", () => {
    expect(cardsForUppstartDecision("ADJUST", brief, label).map((c) => c.title)).toEqual([
      "Testa: Hämtar familjerna maten?",
      "Testa: Säger kostchefen ja?",
    ]);
  });

  it("PIVOT: one card per solution field that fell; CONTINUE/PAUSE none", () => {
    expect(cardsForUppstartDecision("PIVOT", brief, label).map((c) => c.title)).toEqual(["Omarbeta lösningen: channels"]);
    expect(cardsForUppstartDecision("CONTINUE", brief, label)).toEqual([]);
    expect(cardsForUppstartDecision("PAUSE", null, label)).toEqual([]);
  });
});

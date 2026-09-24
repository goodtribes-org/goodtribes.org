jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/aiMode", () => ({ getAiClientFor: jest.fn() }));

import {
  cardsForDecision,
  cardsForLanseringDecision,
  cardsForUppstartDecision,
  coerceGateBrief,
  logEntryCount,
  missingCriteria,
  pilotDecisionFor,
  type GateBrief,
} from "../lib/phaseGate";
import type { SynthesisContent } from "../lib/ideaInsights";

describe("coerceGateBrief", () => {
  it("keeps only real canvas fields, and a field that fell can't also hold", () => {
    const b = coerceGateBrief({
      believed: ["Skolkök slänger mat", ""],
      learned: ["Köken vill ha hjälp"],
      held: ["leanCanvas.jobsToBeDone", "leanCanvas.channels", "leanCanvas.notAField", "impactModel.shortTermOutcomes"],
      fell: ["leanCanvas.channels", "valueProposition.vpPains", "nope"],
      recommendation: "pivot",
      reasons: ["Kanalen föll"],
      next_focus: ["Testa hämtning"],
    });
    expect(b.held).toEqual(["leanCanvas.jobsToBeDone", "impactModel.shortTermOutcomes"]);
    expect(b.fell).toEqual(["leanCanvas.channels", "valueProposition.vpPains"]);
    expect(b.believed).toEqual(["Skolkök slänger mat"]);
    expect(b.recommendation).toBe("pivot");
    expect(b.nextFocus).toEqual(["Testa hämtning"]);
  });

  it("defaults to the cautious 'adjust' on a missing or unknown recommendation", () => {
    expect(coerceGateBrief({ recommendation: "yolo" }).recommendation).toBe("adjust");
    expect(coerceGateBrief(null)).toEqual({
      believed: [], learned: [], held: [], fell: [], recommendation: "adjust", reasons: [], nextFocus: [], unanswered: [], successCriteria: [], criteriaVerdicts: [],
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
      { field: "leanCanvas.jobsToBeDone", verdict: "confirmed", reason: "", interviewIds: ["i1"] },
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

describe("Lansering → Etablera", () => {
  const brief = coerceGateBrief({
    criteria: [
      { criterion: "Minst 6 familjer", verdict: "met", evidence: "6 familjer vecka 2" },
      { criterion: "Andel upphämtad mat", verdict: "not_met", evidence: "68 %" },
      { criterion: "Skriftligt godkännande", verdict: "maybe", evidence: "" },
      { criterion: "", verdict: "met" },
    ],
    unanswered: ["Hur många familjer är unika?"],
  });

  it("keeps criterion verdicts, defaulting unknown verdicts to unclear", () => {
    expect(brief.criteriaVerdicts.map((c) => [c.criterion, c.verdict])).toEqual([
      ["Minst 6 familjer", "met"],
      ["Andel upphämtad mat", "not_met"],
      ["Skriftligt godkännande", "unclear"],
    ]);
  });

  it("ADJUST measures what's unclear; PIVOT fixes what wasn't met", () => {
    expect(cardsForLanseringDecision("ADJUST", brief).map((c) => c.title)).toEqual(["Ta reda på: Hur många familjer är unika?", "Mät: Skriftligt godkännande"]);
    expect(cardsForLanseringDecision("PIVOT", brief).map((c) => c.title)).toEqual(["Åtgärda: Andel upphämtad mat"]);
    expect(cardsForLanseringDecision("CONTINUE", brief)).toEqual([]);
  });

  it("maps the gate decision to the pilot's go/no-go", () => {
    expect(pilotDecisionFor("CONTINUE")).toBe("GO");
    expect(pilotDecisionFor("PIVOT")).toBe("NO_GO");
    expect(pilotDecisionFor("PAUSE")).toBe("NO_GO");
    expect(pilotDecisionFor("ADJUST")).toBeNull();
  });

  it("counts non-empty log lines", () => {
    expect(logEntryCount("2026-09-20: a\n\n2026-09-21: b\n")).toBe(2);
    expect(logEntryCount(null)).toBe(0);
  });
});

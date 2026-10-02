import { pickGuesses, sectionAnchor } from "@/lib/ideaStart";
import type { ProvenanceInfo } from "@/lib/fieldProvenance";

const ai: ProvenanceInfo = { author: "AI", status: "ANTAR" };
const reviewed: ProvenanceInfo = { author: "AI_EDITED", status: "ANTAR" };

const assumptions = [
  { key: "leanCanvas.impact", text: "impact" },
  { key: "leanCanvas.jobsToBeDone", text: "jobs" },
  { key: "leanCanvas.keyMetrics", text: "metrics" },
  { key: "leanCanvas.customerSegments", text: "segments" },
  { key: "valueProposition.vpGains", text: "gains" },
];

describe("pickGuesses", () => {
  it("puts the load-bearing fields first, in their order", () => {
    const prov = Object.fromEntries(assumptions.map((a) => [a.key, ai]));
    expect(pickGuesses(assumptions, prov, null).map((g) => g.key)).toEqual([
      "leanCanvas.customerSegments",
      "valueProposition.vpGains",
      "leanCanvas.jobsToBeDone",
    ]);
  });

  it("puts the field Kritikern flagged before everything else", () => {
    const prov = Object.fromEntries(assumptions.map((a) => [a.key, ai]));
    expect(pickGuesses(assumptions, prov, "leanCanvas.keyMetrics", 2).map((g) => g.key)).toEqual([
      "leanCanvas.keyMetrics",
      "leanCanvas.customerSegments",
    ]);
  });

  it("skips guesses someone has already answered, and fields people wrote", () => {
    const prov = {
      "leanCanvas.customerSegments": reviewed,
      "valueProposition.vpGains": ai,
      "leanCanvas.jobsToBeDone": undefined,
      "leanCanvas.impact": ai,
      "leanCanvas.keyMetrics": ai,
    };
    expect(pickGuesses(assumptions, prov, null).map((g) => g.key)).toEqual([
      "valueProposition.vpGains",
      "leanCanvas.impact",
      "leanCanvas.keyMetrics",
    ]);
  });

  it("returns nothing when every guess is answered", () => {
    const prov = Object.fromEntries(assumptions.map((a) => [a.key, reviewed]));
    expect(pickGuesses(assumptions, prov, null)).toEqual([]);
  });
});

describe("sectionAnchor", () => {
  it("maps a field to its section on the Idé page", () => {
    expect(sectionAnchor("valueProposition.vpGains")).toBe("vardeerbjudande");
    expect(sectionAnchor("impactModel.issue")).toBe("impactmodell");
    expect(sectionAnchor("leanCanvas.channels")).toBe("lean-canvas");
  });
});

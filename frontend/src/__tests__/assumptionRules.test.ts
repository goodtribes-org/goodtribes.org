import {
  nextAssumptionToTest,
  parseAssumptionProposals,
  riskyAssumptionsTested,
  sortAssumptions,
  statusHintsFromSynthesis,
  type AssumptionLike,
} from "../lib/assumptionRules";

let n = 0;
const a = (p: Partial<AssumptionLike>): AssumptionLike => ({
  id: `a${++n}`,
  risk: "MEDIUM",
  status: "UNTESTED",
  sourceEntity: null,
  sourceField: null,
  createdAt: new Date(2026, 8, n),
  ...p,
});

describe("assumptionRules", () => {
  it("sorts open before tested, riskiest first, testing before untested, then oldest", () => {
    const low = a({ risk: "LOW" });
    const highOld = a({ risk: "HIGH" });
    const highTesting = a({ risk: "HIGH", status: "TESTING" });
    const tested = a({ risk: "HIGH", status: "SUPPORTED" });
    const med = a({});
    expect(sortAssumptions([tested, low, med, highOld, highTesting]).map((x) => x.id)).toEqual([highTesting.id, highOld.id, med.id, low.id, tested.id]);
  });

  it("picks the riskiest open assumption as the next one to test, or none", () => {
    const high = a({ risk: "HIGH" });
    expect(nextAssumptionToTest([a({ risk: "LOW" }), high])?.id).toBe(high.id);
    expect(nextAssumptionToTest([a({ status: "REFUTED" })])).toBeNull();
    expect(nextAssumptionToTest([])).toBeNull();
  });

  it("gate criterion: needs at least one tested and no open HIGH-risk", () => {
    expect(riskyAssumptionsTested([])).toBe(false);
    expect(riskyAssumptionsTested([a({})])).toBe(false);
    expect(riskyAssumptionsTested([a({ status: "SUPPORTED" }), a({ risk: "LOW" })])).toBe(true);
    expect(riskyAssumptionsTested([a({ status: "SUPPORTED" }), a({ risk: "HIGH", status: "TESTING" })])).toBe(false);
    expect(riskyAssumptionsTested([a({ risk: "HIGH", status: "REFUTED" })])).toBe(true);
  });

  it("turns interview verdicts on a field into hints for open assumptions behind it", () => {
    const open = a({ sourceEntity: "leanCanvas", sourceField: "customerSegments" });
    const done = a({ sourceEntity: "leanCanvas", sourceField: "customerSegments", status: "SUPPORTED" });
    const other = a({ sourceEntity: "leanCanvas", sourceField: "solution" });
    const unlinked = a({});
    const verdicts = [
      { field: "leanCanvas.customerSegments", verdict: "refuted" as const, reason: "Ingen av de fem ville" },
      { field: "leanCanvas.solution", verdict: "unclear" as const, reason: "?" },
    ];
    expect(statusHintsFromSynthesis([open, done, other, unlinked], verdicts)).toEqual([
      { assumptionId: open.id, status: "REFUTED", reason: "Ingen av de fem ville" },
    ]);
  });

  describe("parseAssumptionProposals", () => {
    const source = "leanCanvas.customerSegments: Föräldrar i Rinkeby";
    const keys = ["leanCanvas.customerSegments"];

    it("maps risk, keeps valid field keys and trims", () => {
      const out = parseAssumptionProposals(
        { assumptions: [{ text: " Föräldrar vill ha läxhjälp ", risk: "high", test: "Fråga fem föräldrar", field: "leanCanvas.customerSegments", names: [] }] },
        source,
        keys,
        [],
      );
      expect(out).toEqual([{ text: "Föräldrar vill ha läxhjälp", risk: "HIGH", testPlan: "Fråga fem föräldrar", fieldKey: "leanCanvas.customerSegments" }]);
    });

    it("drops invented names, duplicates and unknown fields", () => {
      const out = parseAssumptionProposals(
        {
          assumptions: [
            { text: "Rädda Barnen vill samarbeta", risk: "high", test: "x", names: ["Rädda Barnen"] },
            { text: "Redan finns", risk: "low", test: "x", names: [] },
            { text: "Nytt", risk: "weird", test: "", field: "bogus.field", names: [] },
            { text: "nytt", risk: "low", test: "x", names: [] },
          ],
        },
        source,
        keys,
        ["redan finns"],
      );
      expect(out).toEqual([{ text: "Nytt", risk: "MEDIUM", testPlan: null, fieldKey: null }]);
    });

    it("tolerates junk input", () => {
      expect(parseAssumptionProposals(null, source, keys, [])).toEqual([]);
      expect(parseAssumptionProposals({ assumptions: "x" }, source, keys, [])).toEqual([]);
    });
  });
});

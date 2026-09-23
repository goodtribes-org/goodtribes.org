jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/aiMode", () => ({ getAiClientFor: jest.fn() }));

import { coerceCritique, coerceSynthesis, splitFieldKey } from "../lib/ideaInsights";

describe("coerceCritique", () => {
  it("keeps at most 3 points, drops unknown field keys but keeps the point", () => {
    const c = coerceCritique({
      points: [
        { text: "Testa betalviljan", field: "leanCanvas.revenueStreams", severity: "high" },
        { text: "Oklart problem", field: "leanCanvas.notAField", severity: "medium" },
        { text: "", field: "leanCanvas.problem", severity: "high" },
        { text: "Tre", severity: "low" },
        { text: "Fyra", severity: "medium" },
      ],
    });
    expect(c.points).toEqual([
      { text: "Testa betalviljan", field: "leanCanvas.revenueStreams", severity: "high" },
      { text: "Oklart problem", field: null, severity: "medium" },
      { text: "Tre", field: null, severity: "medium" },
    ]);
  });
});

describe("coerceSynthesis — grounded in the interviews", () => {
  const assumptions = new Set(["leanCanvas.problem", "valueProposition.vpPains"]);
  const interviews = new Set(["i1", "i2", "i3"]);

  it("only keeps verdicts on assumptions we asked about, citing real interviews", () => {
    const s = coerceSynthesis(
      {
        learnings: ["Köken slänger mycket", "", "Familjerna skäms över att hämta"],
        verdicts: [
          { field: "leanCanvas.problem", verdict: "confirmed", reason: "Alla tre", interview_ids: ["i1", "i2", "i3", "ghost"] },
          { field: "leanCanvas.channels", verdict: "confirmed", reason: "Inte frågat om", interview_ids: ["i1"] },
          { field: "valueProposition.vpPains", verdict: "refuted", reason: "Påhittat", interview_ids: ["ghost"] },
          { field: "leanCanvas.problem", verdict: "refuted", reason: "Dubblett", interview_ids: ["i1"] },
        ],
      },
      assumptions,
      interviews,
    );
    expect(s.learnings).toEqual(["Köken slänger mycket", "Familjerna skäms över att hämta"]);
    expect(s.verdicts).toEqual([
      { field: "leanCanvas.problem", verdict: "confirmed", reason: "Alla tre", interviewIds: ["i1", "i2", "i3"] },
      // No real interview behind it → can't claim refuted.
      { field: "valueProposition.vpPains", verdict: "unclear", reason: "Påhittat", interviewIds: [] },
    ]);
  });
});

describe("splitFieldKey", () => {
  it("accepts only real canvas fields", () => {
    expect(splitFieldKey("leanCanvas.problem")).toEqual({ entity: "leanCanvas", field: "problem" });
    expect(splitFieldKey("valueProposition.vpGains")).toEqual({ entity: "valueProposition", field: "vpGains" });
    expect(splitFieldKey("project.title")).toBeNull();
    expect(splitFieldKey("leanCanvas.nope")).toBeNull();
  });
});

import { DEPENDENCY_TABLE, dependentsOf, targetHref } from "../lib/fieldDependencies";
import { LEAN_CANVAS_FIELDS } from "../app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
import { VALUE_PROPOSITION_FIELDS } from "../app/[locale]/projects/[slug]/(workspace)/value-proposition/fields";
import { IMPACT_MODEL_FIELDS } from "../app/[locale]/projects/[slug]/(workspace)/impact-model/fields";

const FIELD_KEYS = new Set([
  ...LEAN_CANVAS_FIELDS.map((f) => `leanCanvas.${f}`),
  ...VALUE_PROPOSITION_FIELDS.map((f) => `valueProposition.${f}`),
  ...IMPACT_MODEL_FIELDS.map((f) => `impactModel.${f}`),
]);

describe("fieldDependencies", () => {
  it("every source and target is a real field key or a known page", () => {
    for (const [source, targets] of Object.entries(DEPENDENCY_TABLE)) {
      expect(FIELD_KEYS.has(source)).toBe(true);
      for (const t of targets) expect(FIELD_KEYS.has(t) || t.startsWith("page:")).toBe(true);
    }
  });

  it("no field points at itself", () => {
    for (const [source, targets] of Object.entries(DEPENDENCY_TABLE)) expect(targets).not.toContain(source);
  });

  it("changing who it's for flags the value proposition, the impact model's participants and the interview guide", () => {
    expect(dependentsOf("leanCanvas.customerSegments")).toEqual(
      expect.arrayContaining(["valueProposition.vpPains", "impactModel.participants", "page:interviewGuide"]),
    );
  });

  it("fields with no dependents return an empty list", () => {
    expect(dependentsOf("leanCanvas.unfairAdvantage")).toEqual([]);
    expect(dependentsOf("nonsense")).toEqual([]);
  });

  it("links each target to the page it lives on", () => {
    expect(targetHref("valueProposition.vpJobs")).toBe("value-proposition");
    expect(targetHref("impactModel.issue")).toBe("impact-model");
    expect(targetHref("leanCanvas.earlyAdopters")).toBe("customer-model");
    expect(targetHref("leanCanvas.solution")).toBe("lean-canvas");
    expect(targetHref("page:interviewGuide")).toBe("wiki/intervjuguide");
  });
});

// Konsekvenskontroll (docs/plans/ide-iteration.md, point 7): when a canvas
// field changes, which other fields and pages probably need a second look.
// Rule-based on purpose — no AI call, instant, free, predictable — and only
// a hint: nothing is flagged in the data, nothing is blocked.
//
// Keys are "<entity>.<field>" (same as CANVAS_FIELD_KEYS / FieldProvenance)
// or "page:<name>" for a whole page. Edges follow how the Social Lean
// Canvas, Kundmodell, Värdeerbjudande and Impactmodell build on each other.

export type DependencyTarget = `leanCanvas.${string}` | `valueProposition.${string}` | `impactModel.${string}` | "page:interviewGuide" | "page:marketScan";

const DEPENDENCIES: Record<string, DependencyTarget[]> = {
  // Who it's for drives almost everything downstream.
  "leanCanvas.customerSegments": [
    "leanCanvas.earlyAdopters",
    "leanCanvas.channels",
    "leanCanvas.uniqueValueProposition",
    "valueProposition.vpJobs",
    "valueProposition.vpPains",
    "valueProposition.vpGains",
    "impactModel.participants",
    "page:interviewGuide",
  ],
  "leanCanvas.jobsToBeDone": ["valueProposition.vpJobs", "leanCanvas.solution", "page:interviewGuide"],
  "leanCanvas.solution": ["leanCanvas.uniqueValueProposition", "valueProposition.vpProducts", "impactModel.activities", "leanCanvas.costStructure"],
  "leanCanvas.purpose": ["leanCanvas.impact", "impactModel.issue"],
  "leanCanvas.impact": ["impactModel.longTermOutcomes", "leanCanvas.keyMetrics"],
  "leanCanvas.uniqueValueProposition": ["leanCanvas.channels"],
  "leanCanvas.revenueStreams": ["leanCanvas.costStructure"],
  "leanCanvas.alternatives": ["leanCanvas.unfairAdvantage", "page:marketScan"],
  "leanCanvas.earlyAdopters": ["leanCanvas.channels", "page:interviewGuide"],
  "valueProposition.vpJobs": ["leanCanvas.jobsToBeDone"],
  "valueProposition.vpPains": ["valueProposition.vpRelievers"],
  "valueProposition.vpGains": ["valueProposition.vpCreators"],
  "valueProposition.vpProducts": ["leanCanvas.solution"],
  "impactModel.issue": ["leanCanvas.purpose"],
  "impactModel.participants": ["leanCanvas.customerSegments"],
  "impactModel.activities": ["leanCanvas.solution", "leanCanvas.costStructure"],
  "impactModel.shortTermOutcomes": ["leanCanvas.keyMetrics"],
  "impactModel.longTermOutcomes": ["leanCanvas.impact"],
};

export function dependentsOf(key: string): DependencyTarget[] {
  return DEPENDENCIES[key] ?? [];
}

// Where each target lives, relative to /projects/[slug]/.
export function targetHref(target: DependencyTarget): string {
  if (target === "page:interviewGuide") return "wiki/intervjuguide";
  if (target === "page:marketScan") return "market-scan";
  if (target.startsWith("valueProposition.")) return "value-proposition";
  if (target.startsWith("impactModel.")) return "impact-model";
  if (target === "leanCanvas.earlyAdopters" || target === "leanCanvas.alternatives") return "customer-model";
  return "lean-canvas";
}

// The one exported for tests and anyone adding a field: every key must be a
// real field key. Exposed so the test can check the whole table.
export const DEPENDENCY_TABLE: Readonly<Record<string, readonly DependencyTarget[]>> = DEPENDENCIES;

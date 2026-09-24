// Social Lean Canvas impact model (socialleancanvas.com/templates). The chain
// ends in LeanCanvas.impact, rendered as the last step, so it isn't listed here.
export const IMPACT_MODEL_FIELDS = [
  "issue",
  "participants",
  "activities",
  "shortTermOutcomes",
  "mediumTermOutcomes",
  "longTermOutcomes",
] as const;

export type ImpactModelField = (typeof IMPACT_MODEL_FIELDS)[number];

// Translation key suffix per field: "ImpactModelPage" fieldX / hintX.
export const IMPACT_MODEL_BLOCKS: { field: ImpactModelField; translationKey: string }[] = [
  { field: "issue", translationKey: "Issue" },
  { field: "participants", translationKey: "Participants" },
  { field: "activities", translationKey: "Activities" },
  { field: "shortTermOutcomes", translationKey: "ShortTermOutcomes" },
  { field: "mediumTermOutcomes", translationKey: "MediumTermOutcomes" },
  { field: "longTermOutcomes", translationKey: "LongTermOutcomes" },
];

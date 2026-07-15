export const LEAN_CANVAS_FIELDS = [
  "problem",
  "alternatives",
  "customerSegments",
  "earlyAdopters",
  "uniqueValueProposition",
  "concept",
  "solution",
  "channels",
  "revenueStreams",
  "costStructure",
  "impact",
  "keyMetrics",
  "unfairAdvantage",
] as const;

export type LeanCanvasField = (typeof LEAN_CANVAS_FIELDS)[number];

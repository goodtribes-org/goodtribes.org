export const LEAN_CANVAS_FIELDS = [
  "problem",
  "customerSegments",
  "uniqueValueProposition",
  "solution",
  "channels",
  "revenueStreams",
  "costStructure",
  "keyMetrics",
  "unfairAdvantage",
] as const;

export type LeanCanvasField = (typeof LEAN_CANVAS_FIELDS)[number];

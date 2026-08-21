export const LEAN_CANVAS_FIELDS = [
  "problem",
  "alternatives",
  "customerSegments",
  "earlyAdopters",
  // Legacy single-field value proposition — no longer editable via the grid
  // (superseded by the 6 vp* fields below), kept only as a read-only fallback
  // for canvases saved before the Value Proposition Canvas existed.
  "uniqueValueProposition",
  "vpJobs",
  "vpPains",
  "vpGains",
  "vpProducts",
  "vpRelievers",
  "vpCreators",
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

// Translation key suffix per field — labels reuse the "LeanCanvasHistory" namespace's
// fieldX keys, hints live under "LeanCanvasFields" hintX. See LeanCanvasGrid.tsx.
// The 6 vp* fields aren't listed here — they render as one composite
// ValuePropositionCanvas widget (grid area "vp") instead of individual blocks.
export const LEAN_CANVAS_BLOCKS: { field: LeanCanvasField; area: string; translationKey: string }[] = [
  { field: "problem", area: "problem", translationKey: "Problem" },
  { field: "alternatives", area: "alt", translationKey: "Alternatives" },
  { field: "solution", area: "solution", translationKey: "Solution" },
  { field: "keyMetrics", area: "metrics", translationKey: "KeyMetrics" },
  { field: "concept", area: "concept", translationKey: "Concept" },
  { field: "unfairAdvantage", area: "unfair", translationKey: "UnfairAdvantage" },
  { field: "channels", area: "channels", translationKey: "Channels" },
  { field: "customerSegments", area: "segments", translationKey: "CustomerSegments" },
  { field: "earlyAdopters", area: "early", translationKey: "EarlyAdopters" },
  { field: "costStructure", area: "cost", translationKey: "CostStructure" },
  { field: "impact", area: "impact", translationKey: "Impact" },
  { field: "revenueStreams", area: "revenue", translationKey: "RevenueStreams" },
];

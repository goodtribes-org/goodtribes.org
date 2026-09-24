// Social Lean Canvas (socialleancanvas.com, slc@2.0.1, CC BY-SA 3.0 — Rowan
// Yeoman, Dave Moskovitz & the Ākina Foundation). The model/table is still
// called LeanCanvas; only the blocks changed.
export const LEAN_CANVAS_FIELDS = [
  "purpose",
  "impact",
  "jobsToBeDone",
  "solution",
  "keyMetrics",
  "uniqueValueProposition",
  "unfairAdvantage",
  "channels",
  "customerSegments",
  "costStructure",
  "revenueStreams",
] as const;

export type LeanCanvasField = (typeof LEAN_CANVAS_FIELDS)[number];

// Blocks from the earlier Lean Canvas that the Social Lean Canvas doesn't have.
// Their columns keep existing data: shown read-only on the canvas page and in
// history, copied along in snapshots, but never edited or AI-filled again.
export const LEGACY_LEAN_CANVAS_FIELDS = ["problem", "alternatives", "earlyAdopters", "concept"] as const;

export type LegacyLeanCanvasField = (typeof LEGACY_LEAN_CANVAS_FIELDS)[number];

// Every stored column — use for version snapshots and draft→project copies so
// legacy text is never lost.
export const LEAN_CANVAS_STORED_FIELDS = [...LEAN_CANVAS_FIELDS, ...LEGACY_LEAN_CANVAS_FIELDS] as const;

// Translation key suffix per field — labels reuse the "LeanCanvasHistory" namespace's
// fieldX keys, hints live under "LeanCanvasFields" hintX. See LeanCanvasGrid.tsx.
export const LEAN_CANVAS_BLOCKS: { field: LeanCanvasField; area: string; translationKey: string }[] = [
  { field: "purpose", area: "purpose", translationKey: "Purpose" },
  { field: "impact", area: "impact", translationKey: "Impact" },
  { field: "jobsToBeDone", area: "jobs", translationKey: "JobsToBeDone" },
  { field: "solution", area: "solution", translationKey: "Solution" },
  { field: "keyMetrics", area: "metrics", translationKey: "KeyMetrics" },
  { field: "uniqueValueProposition", area: "uvp", translationKey: "UniqueValueProposition" },
  { field: "unfairAdvantage", area: "advantage", translationKey: "UnfairAdvantage" },
  { field: "channels", area: "channels", translationKey: "Channels" },
  { field: "customerSegments", area: "segments", translationKey: "CustomerSegments" },
  { field: "costStructure", area: "cost", translationKey: "CostStructure" },
  { field: "revenueStreams", area: "revenue", translationKey: "RevenueStreams" },
];

export const LEGACY_LEAN_CANVAS_BLOCKS: { field: LegacyLeanCanvasField; translationKey: string }[] = [
  { field: "problem", translationKey: "Problem" },
  { field: "alternatives", translationKey: "Alternatives" },
  { field: "earlyAdopters", translationKey: "EarlyAdopters" },
  { field: "concept", translationKey: "Concept" },
];

// Desktop layout, mirroring the official canvas: purpose | impact on top,
// five columns in the middle, costs | revenue at the bottom.
export const LEAN_CANVAS_GRID_CSS = `
  .leancanvas-grid { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
  @media (min-width: 900px) {
    .leancanvas-grid {
      grid-template-columns: repeat(10, 1fr);
      grid-template-areas:
        "purpose purpose purpose purpose purpose impact impact impact impact impact"
        "jobs jobs solution solution uvp uvp advantage advantage segments segments"
        "jobs jobs metrics metrics uvp uvp channels channels segments segments"
        "cost cost cost cost cost revenue revenue revenue revenue revenue";
    }
${LEAN_CANVAS_BLOCKS.map((b) => `    .leancanvas-grid > [data-area="${b.area}"] { grid-area: ${b.area}; }`).join("\n")}
  }
`;

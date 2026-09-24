// Social Lean Canvas (socialleancanvas.com, slc@2.0.1, CC BY-SA 3.0 — Rowan
// Yeoman, Dave Moskovitz & the Ākina Foundation). The model/table is still
// called LeanCanvas; only the blocks changed.
//
// Every editable field: the canvas's 11 blocks plus the two extra blocks of
// its customer model (early adopters, existing alternatives), which only
// show in the Kundmodell view, not on the canvas grid.
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
  "earlyAdopters",
  "alternatives",
] as const;

export type LeanCanvasField = (typeof LEAN_CANVAS_FIELDS)[number];

// Blocks from the earlier Lean Canvas that the Social Lean Canvas doesn't have.
// Their columns keep existing data: shown read-only on the canvas page and in
// history, copied along in snapshots, but never edited or AI-filled again.
export const LEGACY_LEAN_CANVAS_FIELDS = ["problem", "concept"] as const;

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
  { field: "concept", translationKey: "Concept" },
];

// The two customer-model blocks that aren't on the canvas grid.
export const CUSTOMER_MODEL_EXTRA_BLOCKS: { field: LeanCanvasField; translationKey: string }[] = [
  { field: "earlyAdopters", translationKey: "EarlyAdopters" },
  { field: "alternatives", translationKey: "Alternatives" },
];

// Social Lean Canvas customer model (socialleancanvas.com/templates): four
// canvas blocks, with early adopters under customers and existing
// alternatives under jobs to be done.
export const CUSTOMER_MODEL_BLOCKS: { field: LeanCanvasField; area: string; translationKey: string }[] = [
  { field: "customerSegments", area: "customers", translationKey: "CustomerSegments" },
  { field: "earlyAdopters", area: "early", translationKey: "EarlyAdopters" },
  { field: "jobsToBeDone", area: "jobs", translationKey: "JobsToBeDone" },
  { field: "alternatives", area: "alt", translationKey: "Alternatives" },
  { field: "uniqueValueProposition", area: "uvp", translationKey: "UniqueValueProposition" },
  { field: "solution", area: "solution", translationKey: "Solution" },
];

export const CUSTOMER_MODEL_GRID_CSS = `
  .customermodel-grid { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
  @media (min-width: 900px) {
    .customermodel-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      grid-template-areas:
        "customers jobs uvp solution"
        "early alt uvp solution";
    }
${CUSTOMER_MODEL_BLOCKS.map((b) => `    .customermodel-grid > [data-area="${b.area}"] { grid-area: ${b.area}; }`).join("\n")}
  }
`;

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

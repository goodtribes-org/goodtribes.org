import type { FieldKnowledgeStatus } from "@prisma/client";

// A canvas block's state at a glance, drawn as its border colour
// (LeanCanvasBlock): empty, has content but is still an assumption, or
// confirmed ("Vet"). Calm, darker tones (2026-10-03, replacing the bright
// red/amber/green): a deeper, muted red, a clear orange and a sage green. A block with content and no provenance
// row counts as an assumption — the same default as FieldProvenance
// ("everything starts as ANTAR").
export type CanvasBlockStatus = "empty" | "assumed" | "known";

export function canvasBlockStatus(value: string | null | undefined, knowledge: FieldKnowledgeStatus | null | undefined): CanvasBlockStatus {
  if (!value?.trim()) return "empty";
  return knowledge === "VET" ? "known" : "assumed";
}

export const CANVAS_BLOCK_BORDER: Record<CanvasBlockStatus, string> = {
  empty: "border-[#B5524C]",
  assumed: "border-[#E08A00]",
  known: "border-[#6E9A7B]",
};

// The soft shadow every canvas box has (Lean Canvas, value proposition,
// impact model), so the boxes read as cards without loud borders.
export const CANVAS_BLOCK_SHADOW = "shadow-[0_1px_2px_rgba(16,24,40,0.06),0_2px_6px_rgba(16,24,40,0.06)]";

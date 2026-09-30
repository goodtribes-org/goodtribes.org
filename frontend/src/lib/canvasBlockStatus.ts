import type { FieldKnowledgeStatus } from "@prisma/client";

// A canvas block's state at a glance, drawn as its border colour
// (LeanCanvasBlock): empty = red, has content but is still an assumption =
// amber, confirmed ("Vet") = green. A block with content and no provenance
// row counts as an assumption — the same default as FieldProvenance
// ("everything starts as ANTAR").
export type CanvasBlockStatus = "empty" | "assumed" | "known";

export function canvasBlockStatus(value: string | null | undefined, knowledge: FieldKnowledgeStatus | null | undefined): CanvasBlockStatus {
  if (!value?.trim()) return "empty";
  return knowledge === "VET" ? "known" : "assumed";
}

export const CANVAS_BLOCK_BORDER: Record<CanvasBlockStatus, string> = {
  empty: "border-watermelon/45",
  assumed: "border-amber-400/70",
  known: "border-seagrass/70",
};

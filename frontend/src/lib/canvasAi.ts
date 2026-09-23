import type { AiMode } from "@prisma/client";
import { resolveAiMode } from "@/lib/aiMode";
import { getFieldProvenance, type ProvenanceInfo } from "@/lib/fieldProvenance";
import { getPendingSuggestions, type PendingSuggestion } from "@/lib/aiSuggestions";

export type CanvasAiContext = {
  provenance: Record<string, ProvenanceInfo>;
  suggestions: Record<string, PendingSuggestion>;
  mode: AiMode;
  stepKey: string;
};

const STEP_FOR: Record<"leanCanvas" | "valueProposition", string> = {
  leanCanvas: "lean_canvas_created",
  valueProposition: "value_proposition_created",
};

// Everything a canvas view needs for its AI features (vet/antar marking,
// suggestions next to fields, and the step's AI mode for the review
// button), fetched together. Callers only use it behind the
// ai-project-start flag.
export async function getCanvasAiContext(
  projectId: string,
  entity: "leanCanvas" | "valueProposition",
): Promise<CanvasAiContext> {
  const stepKey = STEP_FOR[entity];
  const [provenance, suggestions, resolved] = await Promise.all([
    getFieldProvenance(projectId, entity),
    getPendingSuggestions(projectId, entity),
    resolveAiMode({ projectId, feature: "canvas-review", stepKey }),
  ]);
  return { provenance, suggestions, mode: resolved.mode, stepKey };
}

"use client";

import { useTranslations } from "next-intl";
import type { ProvenanceInfo } from "@/lib/fieldProvenance";
import LeanCanvasBlock from "./LeanCanvasBlock";
import { LEAN_CANVAS_BLOCKS, LEAN_CANVAS_GRID_CSS } from "./fields";
import type { LeanCanvasField } from "./fields";

interface Props {
  projectSlug: string;
  canvas: Partial<Record<LeanCanvasField, string | null>> | null;
  canEdit: boolean;
  // Per-field provenance, passed only when vet/antar marking is enabled.
  provenance?: Record<string, ProvenanceInfo>;
  // Pending AI suggestions per field (same flag).
  suggestions?: Record<string, { id: string; content: string }>;
}

export default function LeanCanvasGrid({ projectSlug, canvas, canEdit, provenance, suggestions }: Props) {
  const tField = useTranslations("LeanCanvasHistory");
  const tHint = useTranslations("LeanCanvasFields");
  return (
    <>
      <style>{LEAN_CANVAS_GRID_CSS}</style>

      <div className="leancanvas-grid">
        {LEAN_CANVAS_BLOCKS.map((b) => (
          <LeanCanvasBlock
            key={b.field}
            projectSlug={projectSlug}
            field={b.field}
            area={b.area}
            label={tField(`field${b.translationKey}` as Parameters<typeof tField>[0])}
            hint={tHint(`hint${b.translationKey}` as Parameters<typeof tHint>[0])}
            value={canvas ? (canvas[b.field] ?? null) : null}
            canEdit={canEdit}
            provenance={provenance ? (provenance[b.field] ?? null) : undefined}
            suggestion={suggestions?.[b.field]}
          />
        ))}
      </div>
    </>
  );
}

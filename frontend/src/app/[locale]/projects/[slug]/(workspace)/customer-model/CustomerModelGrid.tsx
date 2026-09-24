"use client";

import { useTranslations } from "next-intl";
import type { ProvenanceInfo } from "@/lib/fieldProvenance";
import LeanCanvasBlock from "../lean-canvas/LeanCanvasBlock";
import { CUSTOMER_MODEL_BLOCKS, CUSTOMER_MODEL_GRID_CSS, type LeanCanvasField } from "../lean-canvas/fields";

interface Props {
  projectSlug: string;
  canvas: Partial<Record<LeanCanvasField, string | null>> | null;
  canEdit: boolean;
  provenance?: Record<string, ProvenanceInfo>;
  suggestions?: Record<string, { id: string; content: string }>;
}

// Every block here is a LeanCanvas field, saved through the canvas's own
// action — the customer model is another view of the same row.
export default function CustomerModelGrid({ projectSlug, canvas, canEdit, provenance, suggestions }: Props) {
  const tField = useTranslations("LeanCanvasHistory");
  const tHint = useTranslations("LeanCanvasFields");
  return (
    <>
      <style>{CUSTOMER_MODEL_GRID_CSS}</style>
      <div className="customermodel-grid">
        {CUSTOMER_MODEL_BLOCKS.map((b) => (
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

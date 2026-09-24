"use client";

import { useTranslations } from "next-intl";
import LeanCanvasDraftBlock from "./LeanCanvasDraftBlock";
import { LEAN_CANVAS_BLOCKS, LEAN_CANVAS_GRID_CSS } from "../../projects/[slug]/(workspace)/lean-canvas/fields";
import type { LeanCanvasField } from "../../projects/[slug]/(workspace)/lean-canvas/fields";

interface Props {
  draftId: string;
  canvas: Partial<Record<LeanCanvasField, string | null>> | null;
  canEdit: boolean;
}

export default function LeanCanvasDraftGrid({ draftId, canvas, canEdit }: Props) {
  const tField = useTranslations("LeanCanvasHistory");
  const tHint = useTranslations("LeanCanvasFields");
  return (
    <>
      <style>{LEAN_CANVAS_GRID_CSS}</style>

      <div className="leancanvas-grid">
        {LEAN_CANVAS_BLOCKS.map((b) => (
          <LeanCanvasDraftBlock
            key={b.field}
            draftId={draftId}
            field={b.field}
            area={b.area}
            label={tField(`field${b.translationKey}` as Parameters<typeof tField>[0])}
            hint={tHint(`hint${b.translationKey}` as Parameters<typeof tHint>[0])}
            value={canvas ? (canvas[b.field] ?? null) : null}
            canEdit={canEdit}
          />
        ))}
      </div>
    </>
  );
}

"use client";

import { useTranslations } from "next-intl";
import LeanCanvasBlock from "./LeanCanvasBlock";
import ValuePropositionCanvas, { type VpField } from "@/components/leanCanvas/ValuePropositionCanvas";
import { updateLeanCanvasBlock } from "./actions";
import { LEAN_CANVAS_BLOCKS } from "./fields";
import type { LeanCanvasField } from "./fields";

interface Props {
  projectSlug: string;
  canvas: Partial<Record<LeanCanvasField, string | null>> | null;
  canEdit: boolean;
}

export default function LeanCanvasGrid({ projectSlug, canvas, canEdit }: Props) {
  const tField = useTranslations("LeanCanvasHistory");
  const tHint = useTranslations("LeanCanvasFields");
  return (
    <>
      <style>{`
        .leancanvas-grid { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
        @media (min-width: 900px) {
          .leancanvas-grid {
            grid-template-columns: repeat(10, 1fr);
            grid-template-rows: auto auto auto auto;
            grid-template-areas:
              "problem problem problem solution solution unfair unfair segments segments segments"
              "vp vp vp vp vp vp vp vp vp vp"
              "alt alt metrics metrics concept concept channels channels early early"
              "cost cost cost impact impact impact impact revenue revenue revenue";
          }
          .leancanvas-grid > [data-area="problem"] { grid-area: problem; }
          .leancanvas-grid > [data-area="alt"] { grid-area: alt; }
          .leancanvas-grid > [data-area="solution"] { grid-area: solution; }
          .leancanvas-grid > [data-area="metrics"] { grid-area: metrics; }
          .leancanvas-grid > [data-area="vp"] { grid-area: vp; }
          .leancanvas-grid > [data-area="concept"] { grid-area: concept; }
          .leancanvas-grid > [data-area="unfair"] { grid-area: unfair; }
          .leancanvas-grid > [data-area="channels"] { grid-area: channels; }
          .leancanvas-grid > [data-area="segments"] { grid-area: segments; }
          .leancanvas-grid > [data-area="early"] { grid-area: early; }
          .leancanvas-grid > [data-area="cost"] { grid-area: cost; }
          .leancanvas-grid > [data-area="impact"] { grid-area: impact; }
          .leancanvas-grid > [data-area="revenue"] { grid-area: revenue; }
        }
      `}</style>

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
          />
        ))}
        <ValuePropositionCanvas
          values={canvas ?? {}}
          canEdit={canEdit}
          onSaveField={(field: VpField, formData) => updateLeanCanvasBlock(projectSlug, field, formData)}
        />
      </div>
    </>
  );
}

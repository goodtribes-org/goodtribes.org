"use client";

import { useTranslations } from "next-intl";
import ValuePropositionDraftBlock from "./ValuePropositionDraftBlock";
import { VALUE_PROPOSITION_BLOCKS } from "../../projects/[slug]/(workspace)/value-proposition/fields";
import type { ValuePropositionField } from "../../projects/[slug]/(workspace)/value-proposition/fields";

interface Props {
  draftId: string;
  canvas: Partial<Record<ValuePropositionField, string | null>> | null;
  canEdit: boolean;
}

export default function ValuePropositionDraftGrid({ draftId, canvas, canEdit }: Props) {
  const tField = useTranslations("ValuePropositionHistory");
  const tHint = useTranslations("ValuePropositionFields");
  const valueBlocks = VALUE_PROPOSITION_BLOCKS.filter((b) => b.side === "value");
  const customerBlocks = VALUE_PROPOSITION_BLOCKS.filter((b) => b.side === "customer");

  function renderBlock(b: (typeof VALUE_PROPOSITION_BLOCKS)[number]) {
    return (
      <ValuePropositionDraftBlock
        key={b.field}
        draftId={draftId}
        field={b.field}
        side={b.side}
        label={tField(`field${b.translationKey}` as Parameters<typeof tField>[0])}
        hint={tHint(`hint${b.translationKey}` as Parameters<typeof tHint>[0])}
        value={canvas ? (canvas[b.field] ?? null) : null}
        canEdit={canEdit}
      />
    );
  }

  return (
    <>
      <style>{`
        .vp-canvas-body { container-type: inline-size; display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
        .vp-side { display: flex; flex-direction: column; gap: 0.5rem; }
        .vp-side-head { font-size: 12px; font-weight: 700; }
        .vp-fit { display: flex; align-items: center; justify-content: center; }
        .vp-fit-badge {
          font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
          color: var(--color-watermelon); background: rgba(209, 5, 5, .08);
          border: 1px solid rgba(209, 5, 5, .25); border-radius: 999px; padding: 3px 10px;
        }
        @container (min-width: 640px) {
          .vp-canvas-body { grid-template-columns: 1fr auto 1fr; }
          .vp-fit { flex-direction: column; }
          .vp-fit-badge { writing-mode: vertical-rl; text-orientation: mixed; padding: 8px 4px; }
        }
      `}</style>
      <div className="vp-canvas-body">
        <div className="vp-side">
          <p className="vp-side-head text-coral">
            {tField("valueMapTitle")} <span className="text-dark-slate/40 font-normal">— {tField("valueMapSub")}</span>
          </p>
          {valueBlocks.map(renderBlock)}
        </div>

        <div className="vp-fit" aria-hidden="true">
          <span className="vp-fit-badge">{tField("fitBadge")}</span>
        </div>

        <div className="vp-side">
          <p className="vp-side-head text-seagrass">
            {tField("customerProfileTitle")} <span className="text-dark-slate/40 font-normal">— {tField("customerProfileSub")}</span>
          </p>
          {customerBlocks.map(renderBlock)}
        </div>
      </div>
    </>
  );
}

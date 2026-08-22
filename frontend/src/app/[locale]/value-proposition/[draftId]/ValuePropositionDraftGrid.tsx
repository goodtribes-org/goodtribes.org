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
        .vp-canvas-frame { container-type: inline-size; }
        .vp-canvas-body { display: grid; grid-template-columns: 1fr; gap: 1rem; }
        .vp-side {
          display: flex; flex-direction: column; gap: 0.5rem; padding: 16px;
        }
        .vp-side.value {
          background: rgba(255, 102, 0, .05); border: 1px solid rgba(255, 102, 0, .18); border-radius: 10px;
        }
        .vp-side.customer {
          background: rgba(9, 120, 9, .05); border: 1px solid rgba(9, 120, 9, .18); border-radius: 28px;
        }
        .vp-side-head { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 700; margin-bottom: 2px; }
        .vp-shape-icon { flex-shrink: 0; }
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
      <div className="vp-canvas-frame">
      <div className="vp-canvas-body">
        <div className="vp-side value">
          <p className="vp-side-head text-coral">
            <svg className="vp-shape-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="2.5" y="2.5" width="19" height="19" rx="3" stroke="currentColor" strokeWidth="1.7" />
              <line x1="2.5" y1="9.5" x2="21.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" opacity=".55" />
              <line x1="2.5" y1="16" x2="21.5" y2="16" stroke="currentColor" strokeWidth="1.2" opacity=".55" />
            </svg>
            {tField("valueMapTitle")} <span className="text-dark-slate/40 font-normal">— {tField("valueMapSub")}</span>
          </p>
          {valueBlocks.map(renderBlock)}
        </div>

        <div className="vp-fit" aria-hidden="true">
          <span className="vp-fit-badge">{tField("fitBadge")}</span>
        </div>

        <div className="vp-side customer">
          <p className="vp-side-head text-seagrass">
            <svg className="vp-shape-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.7" />
              <path d="M12 2.5 L12 21.5 M4.6 6.8 L19.4 17.2 M19.4 6.8 L4.6 17.2" stroke="currentColor" strokeWidth="1" opacity=".5" />
            </svg>
            {tField("customerProfileTitle")} <span className="text-dark-slate/40 font-normal">— {tField("customerProfileSub")}</span>
          </p>
          {customerBlocks.map(renderBlock)}
        </div>
      </div>
      </div>
    </>
  );
}

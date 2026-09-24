"use client";

import { useTranslations } from "next-intl";
import type { ProvenanceInfo } from "@/lib/fieldProvenance";
import LeanCanvasBlock from "../lean-canvas/LeanCanvasBlock";
import ImpactModelBlock from "./ImpactModelBlock";
import { IMPACT_MODEL_BLOCKS, type ImpactModelField } from "./fields";

type AiProps = {
  provenance?: Record<string, ProvenanceInfo>;
  suggestions?: Record<string, { id: string; content: string }>;
};

interface Props {
  projectSlug: string;
  model: Partial<Record<ImpactModelField, string | null>> | null;
  // The chain's last step is the canvas's Impact block.
  canvasImpact: string | null;
  legacyProblem: string | null;
  canEdit: boolean;
  // Passed only behind the ai-project-start flag.
  ai?: AiProps;
  canvasAi?: AiProps;
}

export default function ImpactModelChain({ projectSlug, model, canvasImpact, legacyProblem, canEdit, ai, canvasAi }: Props) {
  const t = useTranslations("ImpactModelPage");
  const tField = useTranslations("LeanCanvasHistory");
  return (
    <>
      {/* Container queries, not media queries: the chain sits both on its
          own page and in the narrower Idé overview. Seven steps in a row
          only when there's room for them, otherwise it wraps. */}
      <style>{`
        .impactmodel-wrap { container-type: inline-size; }
        .impactmodel-chain { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
        @container (min-width: 640px) { .impactmodel-chain { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @container (min-width: 900px) { .impactmodel-chain { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @container (min-width: 1300px) { .impactmodel-chain { grid-template-columns: repeat(7, minmax(0, 1fr)); } }
      `}</style>
      <div className="impactmodel-wrap">
        <div className="impactmodel-chain">
          {IMPACT_MODEL_BLOCKS.map((b) => (
            <ImpactModelBlock
              key={b.field}
              projectSlug={projectSlug}
              field={b.field}
              label={t(`field${b.translationKey}` as Parameters<typeof t>[0])}
              hint={t(`hint${b.translationKey}` as Parameters<typeof t>[0])}
              value={model?.[b.field] ?? null}
              canEdit={canEdit}
              legacy={b.field === "issue" && legacyProblem ? { label: t("legacyProblem"), text: legacyProblem } : undefined}
              provenance={ai?.provenance ? (ai.provenance[b.field] ?? null) : undefined}
              suggestion={ai?.suggestions?.[b.field]}
            />
          ))}
          {/* The last step is the canvas's own Impact block — one field, two views. */}
          <LeanCanvasBlock
            projectSlug={projectSlug}
            field="impact"
            area="impact"
            label={tField("fieldImpact")}
            hint={t("hintImpact")}
            value={canvasImpact}
            canEdit={canEdit}
            provenance={canvasAi?.provenance ? (canvasAi.provenance.impact ?? null) : undefined}
            suggestion={canvasAi?.suggestions?.impact}
          />
        </div>
      </div>
    </>
  );
}

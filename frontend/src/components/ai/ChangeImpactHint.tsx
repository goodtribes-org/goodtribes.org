"use client";

import { useTranslations } from "next-intl";
import { CUSTOMER_MODEL_EXTRA_BLOCKS, LEAN_CANVAS_BLOCKS } from "@/app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
import { VALUE_PROPOSITION_BLOCKS } from "@/app/[locale]/projects/[slug]/(workspace)/value-proposition/fields";
import { IMPACT_MODEL_BLOCKS } from "@/app/[locale]/projects/[slug]/(workspace)/impact-model/fields";
import { dependentsOf, targetHref, type DependencyTarget } from "@/lib/fieldDependencies";

/**
 * Shown under a canvas block right after it was changed: "Du ändrade
 * Kundsegment — det kan påverka: …" with links. Rule-based
 * (lib/fieldDependencies.ts), no AI, closable. Renders nothing for a field
 * with no dependents.
 */
export default function ChangeImpactHint({ projectSlug, fieldKey, onClose }: { projectSlug: string; fieldKey: string; onClose: () => void }) {
  const t = useTranslations("ChangeImpactHint");
  const tLc = useTranslations("LeanCanvasHistory");
  const tVp = useTranslations("ValuePropositionHistory");
  const tIm = useTranslations("ImpactModelPage");
  const targets = dependentsOf(fieldKey);
  if (!targets.length) return null;

  const label = (target: DependencyTarget): string => {
    if (target === "page:interviewGuide") return t("interviewGuide");
    if (target === "page:marketScan") return t("marketScan");
    const [entity, field] = target.split(".");
    if (entity === "leanCanvas") {
      const b = [...LEAN_CANVAS_BLOCKS, ...CUSTOMER_MODEL_EXTRA_BLOCKS].find((x) => x.field === field);
      return b ? tLc(`field${b.translationKey}` as Parameters<typeof tLc>[0]) : field;
    }
    if (entity === "valueProposition") {
      const b = VALUE_PROPOSITION_BLOCKS.find((x) => x.field === field);
      return b ? tVp(`field${b.translationKey}` as Parameters<typeof tVp>[0]) : field;
    }
    const b = IMPACT_MODEL_BLOCKS.find((x) => x.field === field);
    return b ? tIm(`field${b.translationKey}` as Parameters<typeof tIm>[0]) : field;
  };

  return (
    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-dark-slate/80" role="status">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-amber-800">{t("heading")}</p>
        <button type="button" onClick={onClose} aria-label={t("close")} className="text-dark-slate/40 hover:text-dark-slate">
          ✕
        </button>
      </div>
      <ul className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
        {targets.map((target) => (
          <li key={target}>
            <a href={`/projects/${projectSlug}/${targetHref(target)}`} className="text-seagrass hover:underline">
              {label(target)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

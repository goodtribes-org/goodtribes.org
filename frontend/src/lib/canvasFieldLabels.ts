import { getTranslations } from "next-intl/server";
import { LEAN_CANVAS_BLOCKS } from "@/app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
import { VALUE_PROPOSITION_BLOCKS } from "@/app/[locale]/projects/[slug]/(workspace)/value-proposition/fields";
import { IMPACT_MODEL_BLOCKS } from "@/app/[locale]/projects/[slug]/(workspace)/impact-model/fields";

// Human labels for every "<entity>.<field>" key the AI insights use (see
// CANVAS_FIELD_KEYS) — shown next to critique points, interview verdicts
// and gate briefs, and used in the cards a gate decision creates.
export async function getCanvasFieldLabels(locale: string): Promise<Record<string, string>> {
  const [tLc, tVp, tIm] = await Promise.all([
    getTranslations({ locale, namespace: "LeanCanvasHistory" }),
    getTranslations({ locale, namespace: "ValuePropositionHistory" }),
    getTranslations({ locale, namespace: "ImpactModelPage" }),
  ]);
  return {
    ...Object.fromEntries(LEAN_CANVAS_BLOCKS.map((b) => [`leanCanvas.${b.field}`, tLc(`field${b.translationKey}` as Parameters<typeof tLc>[0])])),
    ...Object.fromEntries(
      VALUE_PROPOSITION_BLOCKS.map((b) => [`valueProposition.${b.field}`, tVp(`field${b.translationKey}` as Parameters<typeof tVp>[0])]),
    ),
    ...Object.fromEntries(IMPACT_MODEL_BLOCKS.map((b) => [`impactModel.${b.field}`, tIm(`field${b.translationKey}` as Parameters<typeof tIm>[0])])),
  };
}

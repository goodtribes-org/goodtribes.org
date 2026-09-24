"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { CritiquePoint } from "@/lib/ideaInsights";
import { rerunCritique } from "./actions";

// Kritikern's objections at the top of the Idé overview — at most three,
// each linking to the section it's about.
export default function CritiqueBox({
  slug,
  points,
  fieldLabels,
  canEdit,
  writing,
}: {
  slug: string;
  points: CritiquePoint[] | null;
  fieldLabels: Record<string, string>;
  canEdit: boolean;
  writing: boolean;
}) {
  const t = useTranslations("IdeaOverview");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (writing) {
    return (
      <section aria-live="polite" className="rounded-2xl border border-watermelon/30 bg-watermelon/5 p-5">
        <h2 className="text-lg font-semibold text-dark-slate">{t("critiqueHeading")}</h2>
        <p className="mt-1 text-sm text-dark-slate/60">{t("critiqueWriting")}</p>
      </section>
    );
  }
  if (!points?.length && !canEdit) return null;

  function rerun() {
    setError(null);
    startTransition(async () => {
      const res = await rerunCritique(slug);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  const anchor = (field: string | null) =>
    field?.startsWith("valueProposition.") ? "#vardeerbjudande" : field?.startsWith("impactModel.") ? "#impactmodell" : "#lean-canvas";

  return (
    <section aria-labelledby="critique-heading" className="rounded-2xl border border-watermelon/30 bg-watermelon/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="critique-heading" className="text-lg font-semibold text-dark-slate">
          {t("critiqueHeading")}
        </h2>
        {canEdit && (
          <button type="button" onClick={rerun} disabled={pending} className="text-sm font-medium text-dark-slate/60 hover:text-watermelon disabled:opacity-60">
            {pending ? t("critiqueRunning") : points?.length ? t("critiqueRerun") : t("critiqueRun")}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-dark-slate/60">{t("critiqueIntro")}</p>
      {points && points.length > 0 && (
        <ol className="mt-3 flex flex-col gap-2">
          {points.map((p, i) => (
            <li key={i} className="flex gap-3 rounded-lg bg-white/70 p-3 text-sm text-dark-slate/85">
              <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${p.severity === "high" ? "bg-watermelon" : "bg-amber-400"}`} aria-hidden />
              <span className="flex-1">
                {p.text}
                {p.field && fieldLabels[p.field] && (
                  <a href={anchor(p.field)} className="ml-2 whitespace-nowrap text-xs font-medium text-seagrass hover:underline">
                    {fieldLabels[p.field]} →
                  </a>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
      {error && <p className="mt-2 text-sm text-watermelon">{error}</p>}
    </section>
  );
}

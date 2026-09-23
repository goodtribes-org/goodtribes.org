"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { NextStepBrief, NextStepOption } from "@/lib/impactPhaseFill";
import { decideNextStep, generateNextStepBrief } from "./actions";

const OPTIONS: NextStepOption[] = ["continue", "replicate", "close"];

// The journey's last decision: continue, replicate or close responsibly —
// with the AI's brief when asked for, and always the team's call.
export default function NextStepSection({
  slug,
  brief,
  current,
  canEdit,
  isFounder,
  aiAvailable,
}: {
  slug: string;
  brief: NextStepBrief | null;
  current: NextStepOption | null;
  canEdit: boolean;
  isFounder: boolean;
  aiAvailable: boolean;
}) {
  const t = useTranslations("ImpactOverview");
  const router = useRouter();
  const [choice, setChoice] = useState<NextStepOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function act(fn: () => Promise<{ error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        after?.();
        router.refresh();
      }
    });
  }

  const assessment = (o: NextStepOption) => brief?.options.find((x) => x.option === o)?.assessment;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-dark-slate/70">{t("nextIntro")}</p>
      {current && (
        <p className="rounded-lg border border-seagrass/30 bg-seagrass/5 px-3 py-2 text-sm text-dark-slate/80">
          {t("nextDecided", { choice: t(`next_${current}`) })}
        </p>
      )}

      {brief ? (
        <div className="rounded-xl border border-seagrass/30 bg-seagrass/5 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-dark-slate">{t("nextBriefHeading")}</h3>
            {canEdit && aiAvailable && (
              <button type="button" onClick={() => act(() => generateNextStepBrief(slug))} disabled={pending} className="text-xs font-medium text-dark-slate/50 hover:text-seagrass disabled:opacity-60">
                {t("nextBriefAgain")}
              </button>
            )}
          </div>
          <ul className="mt-2 list-disc pl-5 text-dark-slate/80">{brief.situation.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <div className="mt-3 rounded-lg bg-white/70 p-3">
            <p className="font-semibold text-dark-slate">{t("nextRecommendation", { choice: t(`next_${brief.recommendation}`) })}</p>
            <ul className="mt-1 list-disc pl-5 text-dark-slate/75">{brief.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
            {brief.firstSteps.length > 0 && (
              <>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{t("nextFirstSteps")}</p>
                <ul className="mt-1 list-disc pl-5 text-dark-slate/75">{brief.firstSteps.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </>
            )}
          </div>
        </div>
      ) : (
        canEdit &&
        aiAvailable && (
          <div>
            <button type="button" onClick={() => act(() => generateNextStepBrief(slug))} disabled={pending} className="rounded-lg border border-seagrass/60 px-4 py-2 text-sm font-medium text-seagrass hover:bg-seagrass/10 disabled:opacity-60">
              {pending ? t("nextBriefWorking") : t("nextBriefCreate")}
            </button>
          </div>
        )
      )}

      {canEdit && (
        <div role="radiogroup" aria-label={t("nextHeading")} className="grid gap-2 sm:grid-cols-3">
          {OPTIONS.map((o) => {
            const disabled = o === "close" && !isFounder;
            return (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={choice === o}
                disabled={disabled || pending}
                onClick={() => setChoice(o)}
                className={`rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${choice === o ? "border-coral bg-coral/10" : "border-muted-teal/40 bg-white hover:border-coral/60"}`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-dark-slate">
                  {t(`next_${o}`)}
                  {brief?.recommendation === o && <span className="rounded-full bg-seagrass/15 px-1.5 py-px text-[10px] font-semibold text-seagrass">{t("recommended")}</span>}
                </span>
                <span className="mt-1 block text-xs text-dark-slate/60">{assessment(o) ?? t(`nextDesc_${o}`)}</span>
                {disabled && <span className="mt-1 block text-[11px] text-dark-slate/40">{t("founderOnly")}</span>}
              </button>
            );
          })}
        </div>
      )}
      {choice && (
        <div className="flex gap-2">
          <button type="button" onClick={() => act(() => decideNextStep(slug, choice), () => setChoice(null))} disabled={pending} className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-watermelon disabled:opacity-60">
            {pending ? t("saving") : t(`confirm_${choice}`)}
          </button>
          <button type="button" onClick={() => setChoice(null)} className="text-sm text-dark-slate/60 hover:text-dark-slate">
            {t("cancel")}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-watermelon">{error}</p>}
    </div>
  );
}

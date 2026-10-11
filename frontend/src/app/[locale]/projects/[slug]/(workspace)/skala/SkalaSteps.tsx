"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { ScalingPath } from "@prisma/client";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { OPENS_REPLICATION, SCALING_PATHS } from "@/lib/scaling";
import type { SkalaDraft, SkalaDraftKind } from "@/lib/skalaDrafts";
import { keepGrowthComparison, saveScalingPlan, setGrowthPath, suggestSkala } from "./actions";

const PATH_ICON: Record<ScalingPath, string> = { SELF: "🌱", OTHERS: "🤝", HANDOVER: "🏛️", OPEN: "📖" };

// "Hur ni växer" (#331): four ways, one click to choose. The ways where
// others start their own open the project for that — said on the card.
export function GrowthPathPicker({ slug, value, canEdit }: { slug: string; value: ScalingPath | null; canEdit: boolean }) {
  const t = useTranslations("SkalaOverview");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const choose = (path: ScalingPath) =>
    start(async () => {
      setError(null);
      const res = await setGrowthPath(slug, value === path ? null : path);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {SCALING_PATHS.map((p) => {
          const on = value === p;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              disabled={!canEdit || pending}
              onClick={() => choose(p)}
              className={`flex flex-col gap-1 rounded-xl border p-4 text-left disabled:cursor-default ${on ? "border-seagrass bg-seagrass/10" : "border-muted-teal/30 hover:border-seagrass/60"} ${!canEdit && !on ? "opacity-60" : ""}`}
            >
              <span className="font-semibold text-dark-slate">
                <span aria-hidden className="mr-1.5">{PATH_ICON[p]}</span>
                {t(`path_${p}`)}
                {on && <span className="ml-2 text-xs font-semibold text-seagrass">✓ {t("pathChosen")}</span>}
              </span>
              <span className="text-sm text-dark-slate/70">{t(`pathHint_${p}`)}</span>
              {OPENS_REPLICATION.includes(p) && <span className="text-xs text-dark-slate/50">{t("pathOpens")}</span>}
            </button>
          );
        })}
      </div>
      {error && <span className="text-xs text-watermelon">{error}</span>}
    </div>
  );
}

const box = "mx-auto mt-6 flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-seagrass/30 bg-seagrass/5 px-5 py-4";
const aiButton = "inline-flex items-center gap-2 self-center rounded-full bg-seagrass px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-seagrass/90 disabled:opacity-60";

const FIELD_LABEL: Record<string, string> = {
  goals: "goalsLabel",
  geographies: "whereLabel",
  coreFixed: "coreFixedLabel",
  coreAdaptable: "coreAdaptableLabel",
  teamOrLicenseModel: "firstPlaceLabel",
  capitalPlan: "capitalLabel",
};

// "Föreslå med AI" under a Skala step: a draft first; the plan's texts only
// go into fields that are still empty, the comparison of the ways is kept
// as a page if the team wants it.
export function SkalaAiHelp({ slug, kind, current, canKeep = true }: { slug: string; kind: SkalaDraftKind; current?: Record<string, string | null>; canKeep?: boolean }) {
  const t = useTranslations("SkalaOverview");
  const router = useRouter();
  const [draft, setDraft] = useState<SkalaDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [saving, startSave] = useTransition();
  const ask = () =>
    start(async () => {
      setError(null);
      const res = await suggestSkala(slug, kind);
      if (res.error) setError(res.error);
      else if (res.draft) setDraft(res.draft);
    });
  const save = (fn: () => Promise<{ error?: string }>) =>
    startSave(async () => {
      setError(null);
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        setDraft(null);
        router.refresh();
      }
    });
  const empty = (k: string) => !current?.[k]?.trim();
  const fields = draft?.fields ?? {};
  const patch = Object.fromEntries(Object.entries(fields).filter(([k]) => empty(k)));

  return (
    <div className={box}>
      {!draft && (
        <>
          <p className="text-center text-sm text-dark-slate/70">{t(`aiIntro_${kind}`)}</p>
          <button type="button" onClick={ask} disabled={pending} className={aiButton}>
            <span aria-hidden>✨</span>
            {pending ? t("aiThinking") : t("aiSuggest")}
          </button>
        </>
      )}
      {draft?.html && (
        <>
          <div
            className="text-left text-sm text-dark-slate/80 [&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-dark-slate [&_ul]:list-disc [&_ul]:pl-5 [&_em]:text-dark-slate/50"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(draft.html) }}
          />
          <div className="flex items-center justify-center gap-4">
            {canKeep && (
              <button type="button" disabled={saving} onClick={() => save(() => keepGrowthComparison(slug, draft.html!))} className={aiButton}>
                {saving ? t("saving") : t("aiKeep")}
              </button>
            )}
            <button type="button" onClick={() => setDraft(null)} className="text-sm text-dark-slate/60 hover:text-dark-slate">{t("aiClose")}</button>
          </div>
        </>
      )}
      {draft?.fields && (
        <>
          <dl className="flex flex-col gap-2 text-left text-sm">
            {Object.entries(fields).map(([k, v]) => (
              <div key={k} className={empty(k) ? "" : "opacity-50"}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{t(FIELD_LABEL[k] ?? k)}</dt>
                <dd className="whitespace-pre-line text-dark-slate/80">{v}</dd>
              </div>
            ))}
          </dl>
          {Object.keys(patch).length < Object.keys(fields).length && <p className="text-xs text-dark-slate/50">{t("aiOnlyEmpty")}</p>}
          <div className="flex items-center justify-center gap-4">
            {Object.keys(patch).length > 0 && (
              <button type="button" disabled={saving} onClick={() => save(() => saveScalingPlan(slug, patch))} className={aiButton}>
                {saving ? t("saving") : t("aiUseEmpty")}
              </button>
            )}
            <button type="button" onClick={() => setDraft(null)} className="text-sm text-dark-slate/60 hover:text-dark-slate">{t("aiDiscard")}</button>
          </div>
        </>
      )}
      {error && <p className="text-center text-xs text-watermelon">{error}</p>}
    </div>
  );
}

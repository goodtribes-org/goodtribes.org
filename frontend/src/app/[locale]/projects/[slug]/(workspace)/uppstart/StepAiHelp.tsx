"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { composeHypothesis, type HypothesisWords } from "@/lib/mvp";
import type { DraftStep, TestSummary, UppstartDraft } from "@/lib/uppstartDrafts";
import { saveUppstartPlan, suggestForStep, summarizeTests, type UppstartPlanPatch } from "./actions";

const box = "mx-auto mt-6 flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-seagrass/30 bg-seagrass/5 px-5 py-4";
const primary = "inline-flex items-center gap-2 self-center rounded-full bg-seagrass px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-seagrass/90 disabled:opacity-60";
const quiet = "text-sm text-dark-slate/60 hover:text-dark-slate";

// "Föreslå med AI" under an Uppstart step (#322), like Idé's AI buttons: the
// AI's answer is shown as a draft and nothing is saved until the team picks
// it. The pilot plan only fills the fields that are still empty.
export default function StepAiHelp({
  slug,
  step,
  words,
  current,
}: {
  slug: string;
  step: DraftStep;
  words: HypothesisWords;
  // The pilot plan's saved values, so "Använd" never replaces what's written.
  current?: Partial<Record<keyof UppstartPlanPatch, string | null>>;
}) {
  const t = useTranslations("UppstartOverview");
  const router = useRouter();
  const [draft, setDraft] = useState<UppstartDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [saving, startSave] = useTransition();

  function ask() {
    setError(null);
    start(async () => {
      const res = await suggestForStep(slug, step);
      if (res.error) setError(res.error);
      else if (res.draft) setDraft(res.draft);
    });
  }

  function use(patch: UppstartPlanPatch) {
    setError(null);
    startSave(async () => {
      const res = await saveUppstartPlan(slug, patch);
      if (res.error) setError(res.error);
      else {
        setDraft(null);
        router.refresh();
      }
    });
  }

  const actions = (onUse?: () => void, useLabel = t("aiUse")) => (
    <div className="flex items-center justify-center gap-4">
      {onUse && (
        <button type="button" onClick={onUse} disabled={saving} className={primary}>
          {saving ? t("saving") : useLabel}
        </button>
      )}
      <button type="button" onClick={() => setDraft(null)} className={quiet}>
        {onUse ? t("aiDiscard") : t("aiClose")}
      </button>
    </div>
  );

  let body: ReactNode = null;
  if (draft?.step === "mvp_hypothesis") {
    const sentence = composeHypothesis(draft.draft, words);
    body = (
      <>
        <p className="text-base text-dark-slate">{sentence}</p>
        {draft.draft.why && <p className="text-sm text-dark-slate/70">{draft.draft.why}</p>}
        {actions(() => use({ hypothesis: sentence }))}
      </>
    );
  } else if (draft?.step === "mvp_built") {
    body = (
      <>
        <p className="text-sm text-dark-slate/70">{t("aiOptionsIntro")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {draft.draft.map((o, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border border-muted-teal/30 bg-white p-4 text-left">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-seagrass">{t(`mvpType_${o.type}`)}</span>
              <span className="font-semibold text-dark-slate">{o.title}</span>
              <span className="text-sm text-dark-slate/80">{o.description}</span>
              {o.needs && <span className="text-xs text-dark-slate/60">{t("aiNeeds", { needs: o.needs })}</span>}
              <button
                type="button"
                disabled={saving}
                onClick={() => use({ mvpType: o.type, mvpDescription: `${o.title}. ${o.description}${o.needs ? `\n${t("aiNeeds", { needs: o.needs })}` : ""}` })}
                className="mt-auto self-start rounded-full border border-seagrass px-4 py-1.5 text-sm font-semibold text-seagrass hover:bg-seagrass/10 disabled:opacity-60"
              >
                {t("aiPick")}
              </button>
            </div>
          ))}
        </div>
        {actions()}
      </>
    );
  } else if (draft?.step === "mvp_tested") {
    const s = draft.draft;
    body = (
      <div className="flex flex-col gap-3 text-left text-sm text-dark-slate/80">
        {s.whoToAsk.length > 0 && (
          <div>
            <h4 className="font-semibold text-dark-slate">{t("scriptWho")}</h4>
            <ul className="mt-1 list-disc pl-5">{s.whoToAsk.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
        )}
        {s.opening && (
          <div>
            <h4 className="font-semibold text-dark-slate">{t("scriptOpening")}</h4>
            <p className="mt-1 italic">”{s.opening}”</p>
          </div>
        )}
        <div>
          <h4 className="font-semibold text-dark-slate">{t("scriptQuestions")}</h4>
          <ol className="mt-1 list-decimal pl-5">{s.questions.map((q, i) => <li key={i}>{q}</li>)}</ol>
        </div>
        {s.ask && (
          <div>
            <h4 className="font-semibold text-dark-slate">{t("scriptAsk")}</h4>
            <p className="mt-1">{s.ask}</p>
          </div>
        )}
        {actions()}
      </div>
    );
  } else if (draft?.step === "pilot_planned") {
    const d = draft.draft;
    const empty = (k: keyof UppstartPlanPatch) => !current?.[k]?.trim();
    const fields: [keyof UppstartPlanPatch, string, string][] = [
      ["pilotWhere", t("pilotWhereLabel"), d.pilotWhere],
      ["pilotWho", t("pilotWhoLabel"), d.pilotWho],
      ["pilotDuration", t("pilotDurationLabel"), d.pilotDuration],
      ["successCriteria", t("successCriteriaLabel"), d.successCriteria.map((c) => `- ${c}`).join("\n")],
      ["pilotTeam", t("pilotTeamLabel"), d.pilotTeam],
      ["pilotBudget", t("pilotBudgetLabel"), d.pilotBudget],
    ];
    const patch = Object.fromEntries(fields.filter(([k, , v]) => v && empty(k)).map(([k, , v]) => [k, v])) as UppstartPlanPatch;
    body = (
      <>
        <dl className="flex flex-col gap-2 text-left text-sm">
          {fields
            .filter(([, , v]) => v)
            .map(([k, label, v]) => (
              <div key={k} className={empty(k) ? "" : "opacity-50"}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{label}</dt>
                <dd className="whitespace-pre-line text-dark-slate/80">{v}</dd>
              </div>
            ))}
        </dl>
        {Object.keys(patch).length < fields.filter(([, , v]) => v).length && <p className="text-xs text-dark-slate/50">{t("aiOnlyEmpty")}</p>}
        {actions(Object.keys(patch).length ? () => use(patch) : undefined, t("aiUseEmpty"))}
      </>
    );
  }

  return (
    <div className={box}>
      {!draft && (
        <>
          <p className="text-center text-sm text-dark-slate/70">{t(`aiIntro_${step}`)}</p>
          <button type="button" onClick={ask} disabled={pending} className={primary}>
            <span aria-hidden>✨</span>
            {pending ? t("aiThinking") : t("aiSuggest")}
          </button>
        </>
      )}
      {body}
      {error && <p className="text-center text-xs text-watermelon">{error}</p>}
    </div>
  );
}

// "Vad visar testerna?" (#322) once at least three people have tried it.
export function TestSummaryHelp({ slug }: { slug: string }) {
  const t = useTranslations("UppstartOverview");
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function ask() {
    setError(null);
    start(async () => {
      const res = await summarizeTests(slug);
      if (res.error) setError(res.error);
      else if (res.summary) setSummary(res.summary);
    });
  }

  return (
    <div className={box}>
      {summary ? (
        <div className="flex flex-col gap-3 text-left text-sm text-dark-slate/80">
          <h4 className="font-semibold text-dark-slate">{t("summaryHeading")}</h4>
          <ul className="list-disc pl-5">{summary.patterns.map((p, i) => <li key={i}>{p}</li>)}</ul>
          {summary.strongest && <p><span className="font-semibold text-dark-slate">{t("summaryStrongest")}</span> {summary.strongest}</p>}
          {summary.missing.length > 0 && (
            <div>
              <span className="font-semibold text-dark-slate">{t("summaryMissing")}</span>
              <ul className="list-disc pl-5">{summary.missing.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}
          {summary.next && <p><span className="font-semibold text-dark-slate">{t("summaryNext")}</span> {summary.next}</p>}
          <button type="button" onClick={() => setSummary(null)} className={`${quiet} self-center`}>
            {t("aiClose")}
          </button>
        </div>
      ) : (
        <>
          <p className="text-center text-sm text-dark-slate/70">{t("summaryIntro")}</p>
          <button type="button" onClick={ask} disabled={pending} className={primary}>
            <span aria-hidden>✨</span>
            {pending ? t("aiThinking") : t("summaryButton")}
          </button>
        </>
      )}
      {error && <p className="text-center text-xs text-watermelon">{error}</p>}
    </div>
  );
}

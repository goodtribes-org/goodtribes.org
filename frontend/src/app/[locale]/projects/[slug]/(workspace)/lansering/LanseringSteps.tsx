"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { OUTCOME_ICON, OUTCOMES, type Outcome } from "@/lib/pilot";
import type { CriterionMetricDraft } from "@/lib/lanseringFill";
import type { LanseringDraftKind } from "@/lib/lanseringDrafts";
import {
  addMetricForCriterion,
  addPilotLogEntry,
  reportMetricValue,
  savePlanForward,
  saveResultsSummary,
  setCriterionOutcome,
  setPilotStart,
  suggestLansering,
} from "./actions";

// The client parts of Lansering's steps (#327): everything open on the step,
// nothing to unfold. Leads plan and judge; every member logs and reports.

export type MetricView = { id: string; label: string; unit: string; targetValue: number | null; currentValue: number; updates: number };
export type CriterionView = { criterion: string; metric: MetricView | null; outcome: Outcome | null; note: string | null };

const input = "rounded-lg border border-muted-teal/40 px-3 py-2 text-sm text-dark-slate focus:border-seagrass focus:outline-none";
const primary = "rounded-lg bg-seagrass px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60";
const aiBox = "mx-auto mt-6 flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-seagrass/30 bg-seagrass/5 px-5 py-4";
const aiButton = "inline-flex items-center gap-2 self-center rounded-full bg-seagrass px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-seagrass/90 disabled:opacity-60";

function useAct() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<{ error?: string }>, after?: () => void) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        after?.();
        router.refresh();
      }
    });
  };
  return { act, error, pending };
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

export function metricLine(m: MetricView, t: (k: string, v?: Record<string, string | number>) => string) {
  return m.targetValue ? t("metricProgress", { current: fmt(m.currentValue), target: fmt(m.targetValue), unit: m.unit }) : t("metricCurrent", { current: fmt(m.currentValue), unit: m.unit });
}

// ─── Starta piloten ─────────────────────────────────────────────────────────

export function PilotStartDate({ slug, value, canEdit }: { slug: string; value: string | null; canEdit: boolean }) {
  const t = useTranslations("LanseringOverview");
  const [date, setDate] = useState(value ?? "");
  const { act, error, pending } = useAct();
  if (!canEdit) return <p className="text-sm text-dark-slate/80">{value ? t("startedOn", { date: value }) : t("notStarted")}</p>;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} aria-label={t("startDateLabel")} />
      <button type="button" disabled={pending || date === (value ?? "")} onClick={() => act(() => setPilotStart(slug, date || null))} className={primary}>
        {pending ? t("saving") : t("save")}
      </button>
      {error && <span className="text-xs text-watermelon">{error}</span>}
    </div>
  );
}

function AddMetricForm({ slug, criterion, initial }: { slug: string; criterion: string; initial?: CriterionMetricDraft }) {
  const t = useTranslations("LanseringOverview");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [target, setTarget] = useState(initial?.targetValue ? String(initial.targetValue) : "");
  const { act, error, pending } = useAct();
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("metricLabelPlaceholder")} className={`${input} min-w-48 flex-1`} />
      <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={t("metricUnitPlaceholder")} className={`${input} w-32`} />
      <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder={t("metricTargetPlaceholder")} inputMode="decimal" className={`${input} w-24`} />
      <button type="button" disabled={pending || !label.trim() || !unit.trim()} onClick={() => act(() => addMetricForCriterion(slug, criterion, label, unit, target))} className={primary}>
        {pending ? t("saving") : t("addMetric")}
      </button>
      {error && <span className="w-full text-xs text-watermelon">{error}</span>}
    </div>
  );
}

// Each success criterion with the metric that follows it — or a small form
// to add one (prefilled when the team picks an AI suggestion).
export function CriteriaMetrics({ slug, criteria, canEdit, aiHelp }: { slug: string; criteria: CriterionView[]; canEdit: boolean; aiHelp: boolean }) {
  const t = useTranslations("LanseringOverview");
  const [suggestions, setSuggestions] = useState<CriterionMetricDraft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ask = () => {
    setError(null);
    start(async () => {
      const res = await suggestLansering(slug, "metrics");
      if (res.error) setError(res.error);
      else if (res.draft?.kind === "metrics") setSuggestions(res.draft.draft);
    });
  };
  const open = criteria.filter((c) => !c.metric);
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-muted-teal/15">
        {criteria.map((c) => {
          const suggestion = suggestions?.find((s) => s.criterion === c.criterion);
          return (
            <li key={c.criterion} className="py-3 text-sm">
              <p className="font-medium text-dark-slate">{c.criterion}</p>
              {c.metric ? (
                <p className="mt-1 text-dark-slate/70">📏 {c.metric.label}: {metricLine(c.metric, t)}</p>
              ) : canEdit ? (
                <AddMetricForm key={suggestion ? `ai-${suggestion.label}` : "empty"} slug={slug} criterion={c.criterion} initial={suggestion} />
              ) : (
                <p className="mt-1 text-dark-slate/50">{t("noMetric")}</p>
              )}
            </li>
          );
        })}
      </ul>
      {aiHelp && open.length > 0 && !suggestions && (
        <div className={aiBox}>
          <p className="text-center text-sm text-dark-slate/70">{t("aiMetricsIntro")}</p>
          <button type="button" onClick={ask} disabled={pending} className={aiButton}>
            <span aria-hidden>✨</span>
            {pending ? t("aiThinking") : t("aiSuggest")}
          </button>
          {error && <p className="text-center text-xs text-watermelon">{error}</p>}
        </div>
      )}
      {suggestions && <p className="text-xs text-dark-slate/60">{t("aiMetricsFilled")}</p>}
    </div>
  );
}

// ─── Följ piloten ───────────────────────────────────────────────────────────

export function PilotLog({ slug, log, canLog }: { slug: string; log: string | null; canLog: boolean }) {
  const t = useTranslations("LanseringOverview");
  const [entry, setEntry] = useState("");
  const { act, error, pending } = useAct();
  const lines = (log ?? "").split("\n").filter((l) => l.trim()).reverse();
  return (
    <div className="flex flex-col gap-3">
      {canLog && (
        <div className="flex flex-col gap-2">
          <textarea value={entry} onChange={(e) => setEntry(e.target.value)} rows={2} placeholder={t("logPlaceholder")} className={input} />
          <div className="flex items-center gap-3">
            <button type="button" disabled={pending || !entry.trim()} onClick={() => act(() => addPilotLogEntry(slug, entry), () => setEntry(""))} className={`${primary} self-start`}>
              {pending ? t("saving") : t("logAdd")}
            </button>
            {error && <span className="text-xs text-watermelon">{error}</span>}
          </div>
        </div>
      )}
      {lines.length ? (
        <ul className="flex flex-col gap-1.5 text-sm text-dark-slate/80">
          {lines.map((l, i) => {
            const m = l.match(/^(\d{4}-\d{2}-\d{2}):\s*(.*)$/);
            return (
              <li key={i}>
                {m ? (
                  <>
                    <span className="mr-2 text-xs font-semibold text-dark-slate/50">{m[1]}</span>
                    {m[2]}
                  </>
                ) : (
                  l
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-dark-slate/50">{t("logEmpty")}</p>
      )}
    </div>
  );
}

function MetricReport({ slug, metric }: { slug: string; metric: MetricView }) {
  const t = useTranslations("LanseringOverview");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const { act, error, pending } = useAct();
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-muted-teal/30 p-3 text-sm">
      <p>
        <span className="font-semibold text-dark-slate">{metric.label}</span> <span className="text-dark-slate/70">— {metricLine(metric, t)}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={t("reportValuePlaceholder")} inputMode="decimal" className={`${input} w-28`} />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("reportNotePlaceholder")} className={`${input} min-w-40 flex-1`} />
        <button type="button" disabled={pending || !value.trim()} onClick={() => act(() => reportMetricValue(slug, metric.id, value, note), () => { setValue(""); setNote(""); })} className={primary}>
          {pending ? t("saving") : t("report")}
        </button>
      </div>
      {error && <span className="text-xs text-watermelon">{error}</span>}
    </li>
  );
}

export function MetricReports({ slug, metrics, canReport }: { slug: string; metrics: MetricView[]; canReport: boolean }) {
  const t = useTranslations("LanseringOverview");
  if (!metrics.length) return <p className="text-sm text-dark-slate/50">{t("noMetricsYet")}</p>;
  if (!canReport)
    return (
      <ul className="flex flex-col gap-1 text-sm text-dark-slate/80">
        {metrics.map((m) => <li key={m.id}><span className="font-semibold text-dark-slate">{m.label}</span> — {metricLine(m, t)}</li>)}
      </ul>
    );
  return <ul className="flex flex-col gap-2">{metrics.map((m) => <MetricReport key={m.id} slug={slug} metric={m} />)}</ul>;
}

// ─── Vad visade piloten? ────────────────────────────────────────────────────

function CriterionOutcome({ slug, c, canEdit }: { slug: string; c: CriterionView; canEdit: boolean }) {
  const t = useTranslations("LanseringOverview");
  const [outcome, setOutcome] = useState<Outcome | null>(c.outcome);
  const [note, setNote] = useState(c.note ?? "");
  const { act, error, pending } = useAct();
  const dirty = outcome !== c.outcome || note !== (c.note ?? "");
  return (
    <li className="flex flex-col gap-2 py-3 text-sm">
      <p className="font-medium text-dark-slate">{c.criterion}</p>
      {c.metric && <p className="text-dark-slate/70">📏 {c.metric.label}: {metricLine(c.metric, t)}</p>}
      {canEdit ? (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("outcomeLabel")}>
            {OUTCOMES.map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={outcome === o}
                onClick={() => setOutcome(outcome === o ? null : o)}
                className={`rounded-full border px-3 py-1 ${outcome === o ? "border-seagrass bg-seagrass/10 text-dark-slate" : "border-muted-teal/40 text-dark-slate/70 hover:border-seagrass/60"}`}
              >
                {OUTCOME_ICON[o]} {t(`outcome_${o}`)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("outcomeNotePlaceholder")} className={`${input} min-w-48 flex-1`} />
            <button type="button" disabled={pending || !dirty} onClick={() => act(() => setCriterionOutcome(slug, c.criterion, outcome, note))} className={primary}>
              {pending ? t("saving") : t("save")}
            </button>
          </div>
          {error && <span className="text-xs text-watermelon">{error}</span>}
        </>
      ) : (
        <p className="text-dark-slate/80">{c.outcome ? `${OUTCOME_ICON[c.outcome]} ${t(`outcome_${c.outcome}`)}` : t("notAssessed")}{c.note ? ` — ${c.note}` : ""}</p>
      )}
    </li>
  );
}

export function CriteriaOutcomes({ slug, criteria, canEdit }: { slug: string; criteria: CriterionView[]; canEdit: boolean }) {
  return (
    <ul className="flex flex-col divide-y divide-muted-teal/15">
      {criteria.map((c) => <CriterionOutcome key={`${c.criterion}|${c.outcome}|${c.note}`} slug={slug} c={c} canEdit={canEdit} />)}
    </ul>
  );
}

// ─── AI-utkast för sammanfattning och plan framåt ───────────────────────────

const PLAN_LABELS = { targetAudience: "planWhoLabel", howToReach: "planHowLabel", budgetOverview: "planCostLabel", whoPays: "planPaysLabel" } as const;

export function LanseringAiHelp({ slug, kind, current }: { slug: string; kind: Exclude<LanseringDraftKind, "metrics">; current: Record<string, string | null> }) {
  const t = useTranslations("LanseringOverview");
  const [draft, setDraft] = useState<string | Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { act, pending: saving } = useAct();
  const ask = () => {
    setError(null);
    start(async () => {
      const res = await suggestLansering(slug, kind);
      if (res.error) setError(res.error);
      else if (res.draft?.kind === "results") setDraft(res.draft.draft);
      else if (res.draft?.kind === "plan") setDraft(res.draft.draft);
    });
  };
  const empty = (k: string) => !current[k]?.trim();

  let body: ReactNode = null;
  if (typeof draft === "string") {
    body = (
      <>
        <p className="whitespace-pre-line text-left text-sm text-dark-slate/80">{draft}</p>
        <div className="flex items-center justify-center gap-4">
          <button type="button" disabled={saving} onClick={() => act(() => saveResultsSummary(slug, { resultsSummary: draft }), () => setDraft(null))} className={aiButton}>
            {saving ? t("saving") : empty("resultsSummary") ? t("aiUse") : t("aiReplace")}
          </button>
          <button type="button" onClick={() => setDraft(null)} className="text-sm text-dark-slate/60 hover:text-dark-slate">{t("aiDiscard")}</button>
        </div>
      </>
    );
  } else if (draft) {
    const keys = (Object.keys(PLAN_LABELS) as (keyof typeof PLAN_LABELS)[]).filter((k) => draft[k]);
    const patch = Object.fromEntries(keys.filter(empty).map((k) => [k, draft[k]]));
    body = (
      <>
        <dl className="flex flex-col gap-2 text-left text-sm">
          {keys.map((k) => (
            <div key={k} className={empty(k) ? "" : "opacity-50"}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{t(PLAN_LABELS[k])}</dt>
              <dd className="whitespace-pre-line text-dark-slate/80">{draft[k]}</dd>
            </div>
          ))}
        </dl>
        {Object.keys(patch).length < keys.length && <p className="text-xs text-dark-slate/50">{t("aiOnlyEmpty")}</p>}
        <div className="flex items-center justify-center gap-4">
          {Object.keys(patch).length > 0 && (
            <button type="button" disabled={saving} onClick={() => act(() => savePlanForward(slug, patch), () => setDraft(null))} className={aiButton}>
              {saving ? t("saving") : t("aiUseEmpty")}
            </button>
          )}
          <button type="button" onClick={() => setDraft(null)} className="text-sm text-dark-slate/60 hover:text-dark-slate">{t("aiDiscard")}</button>
        </div>
      </>
    );
  }

  return (
    <div className={aiBox}>
      {!draft && (
        <>
          <p className="text-center text-sm text-dark-slate/70">{t(kind === "results" ? "aiResultsIntro" : "aiPlanIntro")}</p>
          <button type="button" onClick={ask} disabled={pending} className={aiButton}>
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

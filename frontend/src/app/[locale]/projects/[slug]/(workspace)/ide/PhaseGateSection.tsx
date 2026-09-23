"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { GateBrief } from "@/lib/phaseGate";
import { decideIdeaGate, generateGateBrief } from "./actions";
import { decideUppstartGate, generateUppstartGateBrief } from "../uppstart/actions";
import { decideLanseringGate, generateLanseringGateBrief } from "../lansering/actions";
import { decideEtableraGate, generateEtableraGateBrief } from "../etablera/actions";
import { decideSkalaGate, generateSkalaGateBrief } from "../skala/actions";

type Outcome = "CONTINUE" | "ADJUST" | "PIVOT" | "PAUSE";
const OUTCOMES: Outcome[] = ["CONTINUE", "ADJUST", "PIVOT", "PAUSE"];
const RECOMMENDED: Record<GateBrief["recommendation"], Outcome> = {
  continue: "CONTINUE",
  adjust: "ADJUST",
  pivot: "PIVOT",
  pause: "PAUSE",
};

const ACTIONS = {
  idea: { brief: generateGateBrief, decide: decideIdeaGate },
  uppstart: { brief: generateUppstartGateBrief, decide: decideUppstartGate },
  lansering: { brief: generateLanseringGateBrief, decide: decideLanseringGate },
  etablera: { brief: generateEtableraGateBrief, decide: decideEtableraGate },
  skala: { brief: generateSkalaGateBrief, decide: decideSkalaGate },
};

const VERDICT_STYLE: Record<string, string> = {
  met: "border-seagrass/40 bg-seagrass/10 text-seagrass",
  not_met: "border-watermelon/40 bg-watermelon/10 text-watermelon",
  unclear: "border-amber-300 bg-amber-50 text-amber-700",
};

// The end of a phase (Idé → Uppstart → Lansering → Etablera → Skala → Impact): are the criteria
// met, what does the evidence say (the AI's one-page brief), and the
// team's decision. A decision point, not a lock — going ahead with
// criteria unmet is allowed and recorded.
export default function PhaseGateSection({
  gate,
  slug,
  criteria,
  countNote,
  brief,
  lastDecision,
  fieldLabels,
  canEdit,
  isFounder,
  aiAvailable,
}: {
  gate: keyof typeof ACTIONS;
  slug: string;
  criteria: { key: string; label: string; met: boolean }[];
  // A count shown after one criterion, e.g. "(3 av 3)" for interviews.
  countNote?: { key: string; text: string };
  brief: GateBrief | null;
  lastDecision: { outcome: Outcome; date: string; missing: string[] } | null;
  fieldLabels: Record<string, string>;
  canEdit: boolean;
  isFounder: boolean;
  aiAvailable: boolean;
}) {
  const t = useTranslations("PhaseGate");
  const router = useRouter();
  const [choice, setChoice] = useState<Outcome | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const missing = criteria.filter((c) => !c.met);
  const actions = ACTIONS[gate];
  // Wording that differs per gate lives under PhaseGate.<gate>.*.
  const tg = (key: string) => (gate === "idea" ? t(key) : t(`${gate}.${key}`));

  function makeBrief() {
    setError(null);
    startTransition(async () => {
      const res = await actions.brief(slug);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function decide() {
    if (!choice) return;
    setError(null);
    startTransition(async () => {
      const res = await actions.decide(slug, choice, note);
      if (res.error) {
        setError(res.error);
        return;
      }
      setChoice(null);
      setNote("");
      if (res.next) router.push(res.next);
      else router.refresh();
    });
  }

  const label = (key: string) => fieldLabels[key] ?? key;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-dark-slate/70">{tg("intro")}</p>

      <ul className="grid gap-1.5 sm:grid-cols-2">
        {criteria.map((c) => (
          <li key={c.key} className={`flex items-center gap-2 text-sm ${c.met ? "text-dark-slate/80" : "text-dark-slate/50"}`}>
            <span aria-hidden className={c.met ? "text-seagrass" : "text-dark-slate/30"}>
              {c.met ? "✓" : "○"}
            </span>
            {c.label}
            {countNote?.key === c.key && <span className="text-xs text-dark-slate/40">({countNote.text})</span>}
          </li>
        ))}
      </ul>

      {lastDecision && (
        <p className="rounded-lg border border-muted-teal/40 bg-dry-sage/15 px-3 py-2 text-sm text-dark-slate/75">
          {t("lastDecision", { date: lastDecision.date, outcome: t(`outcome_${lastDecision.outcome}`) })}
          {lastDecision.missing.length > 0 && ` ${t("wentWithout", { items: lastDecision.missing.join(", ") })}`}
        </p>
      )}

      {/* The brief */}
      {brief ? (
        <div className="rounded-xl border border-seagrass/30 bg-seagrass/5 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-dark-slate">{t("briefHeading")}</h3>
            {canEdit && aiAvailable && (
              <button type="button" onClick={makeBrief} disabled={pending} className="text-xs font-medium text-dark-slate/50 hover:text-seagrass disabled:opacity-60">
                {t("briefAgain")}
              </button>
            )}
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{tg("believed")}</p>
              <ul className="mt-1 list-disc pl-5 text-dark-slate/80">{brief.believed.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{t("learned")}</p>
              <ul className="mt-1 list-disc pl-5 text-dark-slate/80">{brief.learned.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
          </div>
          {(brief.criteriaVerdicts?.length ?? 0) > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{tg("criteriaVerdicts")}</p>
              <ul className="mt-1 flex flex-col gap-1.5">
                {brief.criteriaVerdicts.map((c, i) => (
                  <li key={i} className="rounded-lg bg-white/70 px-3 py-2">
                    <span className="flex flex-wrap items-center gap-2 font-medium text-dark-slate">
                      {c.criterion}
                      <span className={`rounded-full border px-2 py-px text-[11px] font-semibold ${VERDICT_STYLE[c.verdict]}`}>{t(`verdict_${c.verdict}`)}</span>
                    </span>
                    {c.evidence && <span className="mt-0.5 block text-xs text-dark-slate/70">{c.evidence}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(brief.unanswered?.length ?? 0) > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{tg("unanswered")}</p>
              <ul className="mt-1 list-disc pl-5 text-dark-slate/80">{brief.unanswered.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
          )}
          {(brief.held.length > 0 || brief.fell.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {brief.held.map((k) => (
                <span key={k} className="rounded-full border border-seagrass/40 bg-seagrass/10 px-2 py-0.5 text-xs text-seagrass">✓ {label(k)}</span>
              ))}
              {brief.fell.map((k) => (
                <span key={k} className="rounded-full border border-watermelon/40 bg-watermelon/10 px-2 py-0.5 text-xs text-watermelon">✗ {label(k)}</span>
              ))}
            </div>
          )}
          <div className="mt-4 rounded-lg bg-white/70 p-3">
            <p className="font-semibold text-dark-slate">{t("recommendation", { outcome: t(`outcome_${RECOMMENDED[brief.recommendation]}`) })}</p>
            <ul className="mt-1 list-disc pl-5 text-dark-slate/75">{brief.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
            {brief.nextFocus.length > 0 && (
              <>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{tg("nextFocus")}</p>
                <ul className="mt-1 list-disc pl-5 text-dark-slate/75">{brief.nextFocus.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </>
            )}
            {(brief.successCriteria?.length ?? 0) > 0 && (
              <>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{t("successCriteria")}</p>
                <ul className="mt-1 list-disc pl-5 text-dark-slate/75">{brief.successCriteria.map((r, i) => <li key={i}>{r}</li>)}</ul>
                <p className="mt-1 text-xs text-dark-slate/50">{t("successCriteriaHint")}</p>
              </>
            )}
          </div>
        </div>
      ) : (
        canEdit && aiAvailable && (
          <div>
            <button type="button" onClick={makeBrief} disabled={pending} className="rounded-lg border border-seagrass/60 px-4 py-2 text-sm font-medium text-seagrass hover:bg-seagrass/10 disabled:opacity-60">
              {pending ? t("briefWorking") : t("briefCreate")}
            </button>
            <p className="mt-1 text-xs text-dark-slate/50">{tg("briefHint")}</p>
          </div>
        )
      )}

      {/* The decision */}
      {canEdit && (
        <div>
          <h3 className="text-sm font-semibold text-dark-slate">{t("decisionHeading")}</h3>
          <div role="radiogroup" aria-label={t("decisionHeading")} className="mt-2 grid gap-2 sm:grid-cols-2">
            {OUTCOMES.map((o) => {
              const disabled = o === "PAUSE" && !isFounder;
              const recommended = brief && RECOMMENDED[brief.recommendation] === o;
              return (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={choice === o}
                  disabled={disabled || pending}
                  onClick={() => setChoice(o)}
                  className={`rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${
                    choice === o ? "border-coral bg-coral/10" : "border-muted-teal/40 bg-white hover:border-coral/60"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-dark-slate">
                    {t(`outcome_${o}`)}
                    {recommended && <span className="rounded-full bg-seagrass/15 px-1.5 py-px text-[10px] font-semibold text-seagrass">{t("recommended")}</span>}
                  </span>
                  <span className="mt-1 block text-xs text-dark-slate/60">{tg(`outcomeDesc_${o}`)}</span>
                  {disabled && <span className="mt-1 block text-[11px] text-dark-slate/40">{t("founderOnly")}</span>}
                </button>
              );
            })}
          </div>

          {choice && (
            <div className="mt-3 flex flex-col gap-2">
              {choice === "CONTINUE" && missing.length > 0 && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {t("missingWarning", { items: missing.map((m) => m.label).join(", ") })}
                </p>
              )}
              <label className="text-sm text-dark-slate/70">
                {t("noteLabel")}
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-muted-teal px-3 py-2 text-sm" />
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={decide} disabled={pending} className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-watermelon disabled:opacity-60">
                  {pending ? t("deciding") : choice === "CONTINUE" ? tg("confirm_CONTINUE") : t(`confirm_${choice}`)}
                </button>
                <button type="button" onClick={() => setChoice(null)} className="text-sm text-dark-slate/60 hover:text-dark-slate">
                  {t("cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-sm text-watermelon">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { DREAM_CANVAS_FIELDS, type DreamSummary, type DreamSummarySections, type ProposedField } from "@/lib/dreamSummary";
import { LEAN_CANVAS_BLOCKS } from "@/app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
import { SDG_LABELS_SV } from "@/lib/sdg";
import { approveDreamSummary, generateDreamSummary, reopenDreamConversation } from "../../actions";

const SECTION_KEYS: (keyof DreamSummarySections)[] = ["dream", "problem", "idea", "people", "conditions"];
const SECTION_LABEL: Record<keyof DreamSummarySections, string> = {
  dream: "sectionDream",
  problem: "sectionProblem",
  idea: "sectionIdea",
  people: "sectionPeople",
  conditions: "sectionConditions",
};

function isRedirect(e: unknown): boolean {
  return !!e && typeof e === "object" && String((e as { digest?: string }).digest ?? "").startsWith("NEXT_REDIRECT");
}

// "Så här förstod jag dig": the summary to approve, correct or edit. Nothing
// is written to a project until "Godkänn" — and then exactly what's listed
// under "Det här fylls i".
export default function SummaryReview({
  roomId,
  aiMode,
  summary,
}: {
  roomId: string;
  aiMode: "AGENT" | "ASSIST";
  summary: DreamSummary;
}) {
  const t = useTranslations("DreamSummary");
  const tField = useTranslations("LeanCanvasHistory");
  const [sections, setSections] = useState<DreamSummarySections>(summary.sections);
  const [correcting, setCorrecting] = useState(false);
  const [correction, setCorrection] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        if (isRedirect(e)) throw e;
        setError(e instanceof Error && e.message ? e.message : t("genericError"));
      }
    });
  }

  function canvasLabel(field: string): string {
    const block = LEAN_CANVAS_BLOCKS.find((b) => b.field === field);
    return block ? tField(`field${block.translationKey}` as Parameters<typeof tField>[0]) : field;
  }

  const proposals: { label: string; field: ProposedField }[] =
    aiMode === "AGENT"
      ? DREAM_CANVAS_FIELDS.flatMap((f) => (summary.canvas[f]?.value ? [{ label: canvasLabel(f), field: summary.canvas[f]! }] : []))
      : [];

  return (
    <div className="max-w-3xl mx-auto py-4">
      <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
      <p className="mt-1 text-sm text-dark-slate/60">{t("intro")}</p>

      <div className="mt-6 flex flex-col gap-4">
        {SECTION_KEYS.map((key) => (
          <label key={key} className="block">
            <span className="text-sm font-semibold text-dark-slate">{t(SECTION_LABEL[key])}</span>
            <textarea
              value={sections[key]}
              onChange={(e) => setSections((s) => ({ ...s, [key]: e.target.value }))}
              rows={key === "dream" ? 2 : 3}
              className="mt-1 w-full rounded-lg border border-muted-teal/60 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-seagrass"
            />
          </label>
        ))}
      </div>

      {summary.openQuestions.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-dark-slate">{t("openQuestionsHeading")}</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-dark-slate/80">
            {summary.openQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-dark-slate/50">{t("openQuestionsHint")}</p>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-muted-teal/40 bg-white p-4">
        <p className="text-sm font-semibold text-dark-slate">{t("willFillHeading")}</p>
        <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
          <dt className="text-dark-slate/50">{t("projectName")}</dt>
          <dd className="text-dark-slate">{summary.project.title.value}</dd>
          <dt className="text-dark-slate/50">{t("projectSummary")}</dt>
          <dd className="text-dark-slate">{summary.project.summary.value || "—"}</dd>
          {aiMode === "AGENT" && summary.project.sdgGoals.length > 0 && (
            <>
              <dt className="text-dark-slate/50">{t("sdgGoals")}</dt>
              <dd className="text-dark-slate">{summary.project.sdgGoals.map((n) => `${n}. ${SDG_LABELS_SV[n] ?? ""}`).join(", ")}</dd>
            </>
          )}
          {proposals.map((p) => (
            <div key={p.label} className="contents">
              <dt className="text-dark-slate/50">{p.label}</dt>
              <dd className="text-dark-slate">
                {p.field.value}{" "}
                <span
                  className={`ml-1 rounded-full border px-1.5 py-px text-[10px] font-medium ${
                    p.field.basis === "user" ? "border-seagrass/40 bg-seagrass/15 text-seagrass" : "border-amber-300 bg-amber-50 text-amber-700"
                  }`}
                >
                  {p.field.basis === "user" ? t("known") : t("assumed")}
                </span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-dark-slate/50">{aiMode === "AGENT" ? t("agentNote") : t("assistNote")}</p>
      </div>

      {correcting && (
        <div className="mt-6">
          <label className="block text-sm font-semibold text-dark-slate">
            {t("correctionLabel")}
            <textarea
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              rows={3}
              autoFocus
              className="mt-1 w-full rounded-lg border border-muted-teal/60 bg-white px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-seagrass"
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={pending || !correction.trim()}
              onClick={() => run(() => generateDreamSummary(roomId, correction))}
              className="rounded-lg bg-dark-slate px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? t("regenerating") : t("regenerate")}
            </button>
            <button type="button" onClick={() => setCorrecting(false)} className="text-sm text-dark-slate/60 hover:text-dark-slate">
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-watermelon">{error}</p>}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => approveDreamSummary(roomId, sections))}
          className="rounded-lg bg-coral px-5 py-2.5 text-sm font-semibold text-white hover:bg-watermelon disabled:opacity-60"
        >
          {pending ? t("creating") : t("approve")}
        </button>
        {!correcting && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setCorrecting(true)}
            className="rounded-lg border border-muted-teal/60 px-4 py-2.5 text-sm font-medium text-dark-slate/80 hover:border-dark-slate/40"
          >
            {t("notRight")}
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => reopenDreamConversation(roomId))}
          className="text-sm text-dark-slate/60 hover:text-dark-slate"
        >
          {t("backToConversation")}
        </button>
      </div>
    </div>
  );
}

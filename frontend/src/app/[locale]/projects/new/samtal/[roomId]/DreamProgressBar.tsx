"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { DREAM_AREAS, type DreamArea } from "@/lib/dreamConversation";
import { generateDreamSummary, getDreamProgress, type DreamProgress } from "../actions";
import { useTransition } from "react";

const AREA_KEY: Record<DreamArea, string> = {
  dream: "areaDream",
  problem: "areaProblem",
  why_you: "areaWhyYou",
  idea: "areaIdea",
  people: "areaPeople",
  conditions: "areaConditions",
};

// The six areas as a progress indicator. The AI updates the state
// asynchronously after each reply, so this polls while the page is open
// (cheap: one small DB read, no AI call).
export default function DreamProgressBar({ roomId, initial }: { roomId: string; initial: DreamProgress }) {
  const t = useTranslations("DreamConversation");
  const [progress, setProgress] = useState(initial);

  useEffect(() => {
    let active = true;
    const id = window.setInterval(async () => {
      try {
        const next = await getDreamProgress(roomId);
        if (active) setProgress(next);
      } catch {
        // transient — try again on the next tick
      }
    }, 4000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [roomId]);

  const [summarizing, startSummarizing] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Summarising makes sense once there's something to summarise; it's the
  // natural next step (and highlighted) once every area is covered.
  const canSummarize = progress.covered.length >= 3;

  function summarize() {
    setError(null);
    startSummarizing(async () => {
      try {
        await generateDreamSummary(roomId);
      } catch (e) {
        // redirect() on success surfaces as a thrown NEXT_REDIRECT here —
        // Next handles it; only real errors are shown.
        if (!(e instanceof Error) || !String((e as { digest?: string }).digest ?? "").startsWith("NEXT_REDIRECT")) {
          setError(t("summaryError"));
        }
      }
    });
  }

  return (
    <div>
      <ol className="flex flex-wrap gap-1.5" aria-label={t("progressLabel")}>
        {DREAM_AREAS.map((area) => {
          const done = progress.covered.includes(area);
          return (
            <li
              key={area}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                done ? "border-seagrass bg-seagrass/10 text-seagrass" : "border-muted-teal/50 bg-white text-dark-slate/50"
              }`}
            >
              {done ? "✓ " : ""}
              {t(AREA_KEY[area])}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-dark-slate/50" aria-live="polite">
        {progress.complete ? t("progressComplete") : t("progressCount", { count: progress.covered.length, total: DREAM_AREAS.length })}
        {progress.openQuestionCount > 0 && ` · ${t("openQuestions", { count: progress.openQuestionCount })}`}
      </p>
      {canSummarize && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={summarize}
            disabled={summarizing}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
              progress.complete ? "bg-coral text-white hover:bg-watermelon" : "border border-coral text-coral hover:bg-coral/10"
            }`}
          >
            {summarizing ? t("summarizing") : t("summarize")}
          </button>
          {!progress.complete && <span className="text-xs text-dark-slate/50">{t("summarizeEarlyHint")}</span>}
          {error && <span className="text-xs text-watermelon">{error}</span>}
        </div>
      )}
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { DREAM_AREAS, type DreamArea } from "@/lib/dreamConversation";
import type { DreamProgress } from "../actions";
import { useDreamSummary } from "./useDreamSummary";

const AREA_KEY: Record<DreamArea, string> = {
  dream: "areaDream",
  problem: "areaProblem",
  why_you: "areaWhyYou",
  idea: "areaIdea",
  people: "areaPeople",
  conditions: "areaConditions",
};

// The six areas as a progress indicator, plus an early "Sammanfatta" for
// those who want to wrap up before every area is covered. When the
// conversation is complete, DreamNextStep (at the bottom, where the user is
// typing) takes over as the main call to action.
export default function DreamProgressBar({ roomId, initial }: { roomId: string; initial: DreamProgress }) {
  const t = useTranslations("DreamConversation");
  const { progress, summarize, summarizing, failed } = useDreamSummary(roomId, initial);
  const canSummarizeEarly = progress.covered.length >= 3 && !progress.complete;

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
      {canSummarizeEarly && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={summarize}
            disabled={summarizing}
            className="rounded-lg border border-coral px-4 py-2 text-sm font-semibold text-coral hover:bg-coral/10 disabled:opacity-60"
          >
            {summarizing ? t("summarizing") : t("summarize")}
          </button>
          <span className="text-xs text-dark-slate/50">{t("summarizeEarlyHint")}</span>
          {failed && <span className="text-xs text-watermelon">{t("summaryError")}</span>}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { DREAM_AREAS, type DreamArea } from "@/lib/dreamConversation";
import { getDreamProgress, type DreamProgress } from "../actions";

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
    </div>
  );
}

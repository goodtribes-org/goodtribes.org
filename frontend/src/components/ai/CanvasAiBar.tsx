"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { AiMode } from "@prisma/client";
import { reviewCanvas } from "@/lib/actions/aiSuggestions";
import { setStepAiMode } from "@/lib/actions/aiModeSettings";

/**
 * AI help above a canvas, following the step's AI mode:
 * - AGENT/ASSIST: "Granska det jag skrivit" — at most 3 points of feedback.
 * - MANUAL: no AI at all, just a discreet way to switch this step to
 *   "AI hjälper mig".
 */
export default function CanvasAiBar({
  projectSlug,
  entity,
  stepKey,
  mode,
  canEdit,
}: {
  projectSlug: string;
  entity: "leanCanvas" | "valueProposition";
  stepKey: string;
  mode: AiMode;
  canEdit: boolean;
}) {
  const t = useTranslations("CanvasAiBar");
  const [points, setPoints] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState(mode);
  const [pending, startTransition] = useTransition();
  if (!canEdit) return null;

  if (currentMode === "MANUAL") {
    return (
      <p className="mb-3 text-xs text-dark-slate/50">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setStepAiMode(projectSlug, stepKey, "ASSIST");
              setCurrentMode("ASSIST");
            })
          }
          className="underline-offset-2 hover:text-dark-slate hover:underline"
        >
          {t("switchToAssist")}
        </button>
      </p>
    );
  }

  function review() {
    setError(null);
    startTransition(async () => {
      const res = await reviewCanvas(projectSlug, entity);
      if ("error" in res) {
        setError(res.error);
        setPoints(null);
      } else {
        setPoints(res.points);
      }
    });
  }

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={review}
        disabled={pending}
        className="rounded-lg border border-seagrass/60 px-3 py-1.5 text-xs font-medium text-seagrass hover:bg-seagrass/10 disabled:opacity-60"
      >
        {pending ? t("reviewing") : t("review")}
      </button>
      {error && <p className="mt-2 text-xs text-watermelon">{error}</p>}
      {points && (
        <div className="mt-2 rounded-lg border border-seagrass/30 bg-seagrass/5 p-3">
          <ol className="list-decimal pl-5 text-sm text-dark-slate/80 space-y-1">
            {points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
          <button type="button" onClick={() => setPoints(null)} className="mt-2 text-xs text-dark-slate/50 hover:text-dark-slate">
            {t("close")}
          </button>
        </div>
      )}
    </div>
  );
}

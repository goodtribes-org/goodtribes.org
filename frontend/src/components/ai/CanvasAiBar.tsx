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
  inline = false,
  below = false,
}: {
  projectSlug: string;
  entity: "leanCanvas" | "valueProposition" | "impactModel";
  stepKey: string;
  mode: AiMode;
  canEdit: boolean;
  // On the section's title row (the phase page): no bottom margin, and the
  // review points take a full row of their own when they open.
  inline?: boolean;
  // Under the canvas (the phase page): a centred box with a line saying
  // what the review does, and the points opening inside it.
  below?: boolean;
}) {
  const t = useTranslations("CanvasAiBar");
  const [points, setPoints] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState(mode);
  const [pending, startTransition] = useTransition();
  if (!canEdit) return null;

  if (currentMode === "MANUAL") {
    return (
      <p className={`${below ? "col-start-2 text-center" : "mb-3"} text-xs text-dark-slate/50`}>
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

  if (below) {
    // Items of the step's action row (StepActions on the phase page, a
    // three-column grid): the button in the middle, "Klar" at the right;
    // error and review points on a full line of their own under the row.
    return (
      <>
        <button
          type="button"
          onClick={review}
          disabled={pending}
          className="col-start-2 inline-flex items-center gap-2 rounded-full border border-dark-slate/15 bg-white px-5 py-2.5 text-sm font-semibold text-dark-slate shadow-sm transition hover:border-dark-slate/30 hover:bg-dry-sage/10 disabled:opacity-60"
        >
          <span aria-hidden className="text-[#E08A00]">✨</span>
          {pending ? t("reviewing") : t("review")}
        </button>
        {error && <p className="col-span-3 text-center text-xs text-watermelon">{error}</p>}
        {points && (
          <div className="order-last col-span-3 rounded-xl border border-seagrass/30 bg-white p-4 text-left">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-dark-slate/80">
              {points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
            <button type="button" onClick={() => setPoints(null)} className="mt-2 text-xs text-dark-slate/50 hover:text-dark-slate">
              {t("close")}
            </button>
          </div>
        )}
      </>
    );
  }


  return (
    <div className={inline ? (points || error ? "flex w-full flex-col items-end" : "") : "mb-3"}>
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
        <div className={`mt-2 rounded-lg border border-seagrass/30 bg-seagrass/5 p-3${inline ? " w-full text-left" : ""}`}>
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

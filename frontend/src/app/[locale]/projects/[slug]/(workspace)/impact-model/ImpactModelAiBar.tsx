"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { AiMode } from "@prisma/client";
import { setStepAiMode } from "@/lib/actions/aiModeSettings";
import { draftImpactModelWithAi } from "./actions";

/**
 * AI help above the impact model, following the canvas step's AI mode:
 * AGENT fills empty steps, ASSIST puts suggestions next to them, MANUAL
 * shows only a discreet way to switch to "AI hjälper mig" (same as
 * CanvasAiBar).
 */
export default function ImpactModelAiBar({
  projectSlug,
  stepKey,
  mode,
  canEdit,
}: {
  projectSlug: string;
  stepKey: string;
  mode: AiMode;
  canEdit: boolean;
}) {
  const t = useTranslations("ImpactModelPage");
  const tBar = useTranslations("CanvasAiBar");
  const [currentMode, setCurrentMode] = useState(mode);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
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
          {tBar("switchToAssist")}
        </button>
      </p>
    );
  }

  function draft() {
    setMessage(null);
    startTransition(async () => {
      const res = await draftImpactModelWithAi(projectSlug);
      if ("error" in res) setMessage({ text: res.error, error: true });
      else if (res.written && res.suggested) setMessage({ text: t("aiDoneBoth", { written: res.written, suggested: res.suggested }), error: false });
      else if (res.written) setMessage({ text: t("aiDoneWritten", { count: res.written }), error: false });
      else setMessage({ text: t("aiDoneSuggested", { count: res.suggested }), error: false });
    });
  }

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={draft}
        disabled={pending}
        className="rounded-lg border border-seagrass/60 px-3 py-1.5 text-xs font-medium text-seagrass hover:bg-seagrass/10 disabled:opacity-60"
      >
        {pending ? t("aiWorking") : currentMode === "AGENT" ? t("aiFill") : t("aiSuggest")}
      </button>
      {message && <p className={`mt-2 text-xs ${message.error ? "text-watermelon" : "text-dark-slate/60"}`}>{message.text}</p>}
    </div>
  );
}

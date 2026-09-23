"use client";

import { useTranslations } from "next-intl";
import type { DreamProgress } from "../actions";
import { useDreamSummary } from "./useDreamSummary";

// Once the conversation is complete, tells the user what happens next —
// right where they are (the bottom of the chat, sticky while scrolling),
// not at the top of the page. Nothing happens by itself: the project is
// created when they press the button.
export default function DreamNextStep({ roomId, initial, aiMode }: { roomId: string; initial: DreamProgress; aiMode: "AGENT" | "ASSIST" }) {
  const t = useTranslations("DreamConversation");
  const { progress, summarize, summarizing, failed } = useDreamSummary(roomId, initial);
  // Already created: nothing left to do here.
  if (progress.status === "confirmed" || progress.status === "abandoned") return null;
  // "summary_pending" is a conversation from before the summary step was
  // removed — it's complete too.
  if (!progress.complete && progress.status !== "summary_pending") return null;

  return (
    <div className="sticky bottom-0 z-20 mt-4 pb-4">
      <div role="status" className="rounded-2xl border border-coral/40 bg-white p-4 shadow-lg">
        <p className="text-base font-semibold text-dark-slate">{t("nextStepHeading")}</p>
        <p className="mt-1 text-sm text-dark-slate/70">{t(aiMode === "AGENT" ? "nextStepBodyAgent" : "nextStepBodyAssist")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={summarize}
            disabled={summarizing}
            className="rounded-lg bg-coral px-5 py-2.5 text-sm font-semibold text-white hover:bg-watermelon disabled:opacity-60"
          >
            {summarizing ? t("nextStepWorking") : t("nextStepButton")}
          </button>
          <span className="text-xs text-dark-slate/50">{summarizing ? t("nextStepWait") : t("nextStepAddMore")}</span>
        </div>
        {failed && <p className="mt-2 text-sm text-watermelon">{t("summaryError")}</p>}
      </div>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { DreamProgress } from "../actions";
import { useDreamSummary } from "./useDreamSummary";

// Once the conversation is complete, tells the user what happens next —
// right where they are (the bottom of the chat, sticky while scrolling),
// not at the top of the page. Nothing happens by itself: the summary starts
// when they press the button, and nothing is saved until they approve it.
export default function DreamNextStep({ roomId, initial }: { roomId: string; initial: DreamProgress }) {
  const t = useTranslations("DreamConversation");
  const { progress, summarize, summarizing, failed } = useDreamSummary(roomId, initial);
  // Already approved: the project exists, nothing left to do here.
  if (progress.status === "confirmed" || progress.status === "abandoned") return null;
  // A summary is already waiting — go to it rather than generating a new one.
  if (progress.status === "summary_pending") {
    return (
      <div className="sticky bottom-0 z-20 mt-4 pb-4">
        <div role="status" className="rounded-2xl border border-coral/40 bg-white p-4 shadow-lg">
          <p className="text-sm text-dark-slate/70">{t("summaryWaiting")}</p>
          <Link
            href={`/projects/new/samtal/${roomId}/sammanfattning`}
            className="mt-3 inline-block rounded-lg bg-coral px-5 py-2.5 text-sm font-semibold text-white hover:bg-watermelon"
          >
            {t("nextStepButton")}
          </Link>
        </div>
      </div>
    );
  }
  if (!progress.complete) return null;

  return (
    <div className="sticky bottom-0 z-20 mt-4 pb-4">
      <div role="status" className="rounded-2xl border border-coral/40 bg-white p-4 shadow-lg">
        <p className="text-base font-semibold text-dark-slate">{t("nextStepHeading")}</p>
        <p className="mt-1 text-sm text-dark-slate/70">{t("nextStepBody")}</p>
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

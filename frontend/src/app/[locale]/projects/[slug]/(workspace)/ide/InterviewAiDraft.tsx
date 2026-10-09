"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { applyInterviewGuide, draftInterviewGuideAction } from "./actions";

// "Låt AI:n föreslå intervjufrågor", under the interview step like the
// canvases' review box. The questions test the project's open assumptions;
// they're shown first and saved as the interview guide only on request.
export default function InterviewAiDraft({ slug, hasGuide }: { slug: string; hasGuide: boolean }) {
  const t = useTranslations("IdeaOverview");
  const router = useRouter();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [applying, startApply] = useTransition();

  function draft() {
    setError(null);
    startTransition(async () => {
      const res = await draftInterviewGuideAction(slug);
      if ("error" in res) setError(res.error);
      else setHtml(res.html);
    });
  }

  function apply() {
    if (!html) return;
    startApply(async () => {
      const res = await applyInterviewGuide(slug, html);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setHtml(null);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto mt-6 flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-seagrass/30 bg-seagrass/5 px-5 py-4 text-center">
      {!html && (
        <>
          <p className="text-sm text-dark-slate/70">{t(hasGuide ? "interviewAiIntroHasGuide" : "interviewAiIntro")}</p>
          <button
            type="button"
            onClick={draft}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-seagrass px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-seagrass/90 disabled:opacity-60"
          >
            <span aria-hidden>✨</span>
            {pending ? t("interviewAiWriting") : t(hasGuide ? "interviewAiWriteHasGuide" : "interviewAiWrite")}
          </button>
        </>
      )}
      {error && <p className="text-xs text-watermelon">{error}</p>}
      {html && (
        <div className="w-full text-left">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-seagrass">{t("interviewAiDraftLabel")}</p>
          {/* Built from escaped model text in interviewGuideHtml. */}
          <div
            className="prose prose-sm max-w-none rounded-xl border border-seagrass/30 bg-white p-4 text-dark-slate/85 prose-h2:mt-4 prose-h2:text-base prose-h2:first:mt-0 prose-em:text-[#9a5f00]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={apply}
              disabled={applying}
              className="rounded-full bg-seagrass px-5 py-2 text-sm font-semibold text-white hover:bg-seagrass/90 disabled:opacity-60"
            >
              {applying ? t("saving") : hasGuide ? t("interviewAiReplace") : t("interviewAiUse")}
            </button>
            <button type="button" onClick={draft} disabled={pending} className="text-sm text-dark-slate/60 hover:text-dark-slate">
              {pending ? t("interviewAiWriting") : t("aboutAiAgain")}
            </button>
            <button type="button" onClick={() => setHtml(null)} className="text-sm text-dark-slate/60 hover:text-dark-slate">
              {t("aboutAiDiscard")}
            </button>
          </div>
          {hasGuide && <p className="mt-2 text-center text-xs text-dark-slate/50">{t("interviewAiReplaceNote")}</p>}
        </div>
      )}
    </div>
  );
}

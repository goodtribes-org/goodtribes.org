"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { applyAboutDraft, draftAboutText } from "./actions";
import { TextLengthMeter } from "./ProjectCoverImage";

// "Låt AI:n skriva ett förslag", under "Om projektet" like the canvases'
// review box. The draft is shown next to nothing else and written only on
// "Använd förslaget" — the team's own text is never replaced silently.
export default function AboutAiDraft({ slug }: { slug: string }) {
  const t = useTranslations("IdeaOverview");
  const router = useRouter();
  const [draft, setDraft] = useState<{ summary: string; descriptionHtml: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [applying, startApply] = useTransition();

  function write() {
    setError(null);
    startTransition(async () => {
      const res = await draftAboutText(slug);
      if ("error" in res) setError(res.error);
      else setDraft(res);
    });
  }

  function apply() {
    if (!draft) return;
    startApply(async () => {
      const res = await applyAboutDraft(slug, draft.summary, draft.descriptionHtml);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setDraft(null);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto mt-6 flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-seagrass/30 bg-seagrass/5 px-5 py-4 text-center">
      {!draft && (
        <>
          <p className="text-sm text-dark-slate/70">{t("aboutAiIntro")}</p>
          <button
            type="button"
            onClick={write}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-seagrass px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-seagrass/90 disabled:opacity-60"
          >
            <span aria-hidden>✨</span>
            {pending ? t("aboutAiWriting") : t("aboutAiWrite")}
          </button>
        </>
      )}
      {error && <p className="text-xs text-watermelon">{error}</p>}
      {draft && (
        <div className="w-full text-left">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-seagrass">{t("aboutAiDraftLabel")}</p>
          <div className="rounded-xl border border-seagrass/30 bg-white p-4">
            <p className="text-lg leading-snug text-dark-slate">{draft.summary}</p>
            <div className="mt-1"><TextLengthMeter kind="summary" value={draft.summary} /></div>
            {/* Built from escaped plain text in draftAboutText. */}
            <div className="prose mt-4 max-w-none text-[15px] leading-relaxed text-dark-slate/85" dangerouslySetInnerHTML={{ __html: draft.descriptionHtml }} />
            <div className="mt-1"><TextLengthMeter kind="description" value={draft.descriptionHtml} /></div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={apply}
              disabled={applying}
              className="rounded-full bg-seagrass px-5 py-2 text-sm font-semibold text-white hover:bg-seagrass/90 disabled:opacity-60"
            >
              {applying ? t("saving") : t("aboutAiUse")}
            </button>
            <button type="button" onClick={write} disabled={pending} className="text-sm text-dark-slate/60 hover:text-dark-slate">
              {pending ? t("aboutAiWriting") : t("aboutAiAgain")}
            </button>
            <button type="button" onClick={() => setDraft(null)} className="text-sm text-dark-slate/60 hover:text-dark-slate">
              {t("aboutAiDiscard")}
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-dark-slate/50">{t("aboutAiNote")}</p>
        </div>
      )}
    </div>
  );
}

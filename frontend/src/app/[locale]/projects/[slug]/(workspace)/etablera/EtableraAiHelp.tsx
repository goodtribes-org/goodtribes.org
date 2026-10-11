"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import type { EtableraDraft, EtableraDraftKind } from "@/lib/etableraDrafts";
import { applyEtableraWikiDraft, saveSupporterNotes, suggestEtablera } from "./actions";

const box = "mx-auto mt-6 flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-seagrass/30 bg-seagrass/5 px-5 py-4";
const aiButton = "inline-flex items-center gap-2 self-center rounded-full bg-seagrass px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-seagrass/90 disabled:opacity-60";

// "Föreslå med AI" under an Etablera step (#329): the draft is shown first
// and saved only on "Använd förslaget" — as the step's wiki page (never over
// text someone wrote) or, for the people around the project, into the
// still-empty text field. Shown only while there's nothing written to
// replace; `canUse` stays for a page written meanwhile (the save says so).
export default function EtableraAiHelp({ slug, kind, canUse }: { slug: string; kind: EtableraDraftKind; canUse: boolean }) {
  const t = useTranslations("EtableraOverview");
  const router = useRouter();
  const [draft, setDraft] = useState<EtableraDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [saving, startSave] = useTransition();

  function ask() {
    setError(null);
    start(async () => {
      const res = await suggestEtablera(slug, kind);
      if (res.error) setError(res.error);
      else if (res.draft) setDraft(res.draft);
    });
  }

  function use() {
    if (!draft) return;
    setError(null);
    startSave(async () => {
      const res = draft.html ? await applyEtableraWikiDraft(slug, kind, draft.html) : await saveSupporterNotes(slug, { supporterBaseNotes: draft.text ?? "" });
      if (res.error) setError(res.error);
      else {
        setDraft(null);
        router.refresh();
      }
    });
  }

  return (
    <div className={box}>
      {!draft ? (
        <>
          <p className="text-center text-sm text-dark-slate/70">{t(`aiIntro_${kind}`)}</p>
          <button type="button" onClick={ask} disabled={pending} className={aiButton}>
            <span aria-hidden>✨</span>
            {pending ? t("aiThinking") : t("aiSuggest")}
          </button>
        </>
      ) : (
        <>
          {draft.html ? (
            <div
              className="text-left text-sm text-dark-slate/80 [&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-dark-slate [&_ul]:list-disc [&_ul]:pl-5 [&_em]:text-dark-slate/50"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(draft.html) }}
            />
          ) : (
            <p className="whitespace-pre-line text-left text-sm text-dark-slate/80">{draft.text}</p>
          )}
          {!canUse && <p className="text-xs text-dark-slate/50">{t("aiAlreadyWritten")}</p>}
          <div className="flex items-center justify-center gap-4">
            {canUse && (
              <button type="button" onClick={use} disabled={saving} className={aiButton}>
                {saving ? t("saving") : t("aiUse")}
              </button>
            )}
            <button type="button" onClick={() => setDraft(null)} className="text-sm text-dark-slate/60 hover:text-dark-slate">
              {canUse ? t("aiDiscard") : t("aiClose")}
            </button>
          </div>
        </>
      )}
      {error && <p className="text-center text-xs text-watermelon">{error}</p>}
    </div>
  );
}

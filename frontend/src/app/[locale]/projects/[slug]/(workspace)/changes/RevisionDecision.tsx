"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { acceptRevision, declineRevision } from "../../revision-actions";

// A lead's answer to a proposed change (#290): accept (and by default credit
// the proposer with a card in Done) or decline, with an optional note that
// the proposer gets with the notification.
export default function RevisionDecision({ revisionId }: { revisionId: string }) {
  const t = useTranslations("ProjectRevisions");
  const router = useRouter();
  const [note, setNote] = useState("");
  const [credit, setCredit] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(accept: boolean) {
    setError(null);
    start(async () => {
      const res = accept ? await acceptRevision(revisionId, note, credit) : await declineRevision(revisionId, note);
      if ("error" in res) setError(t.has(`error.${res.error}`) ? t(`error.${res.error}` as Parameters<typeof t>[0]) : t("error.generic"));
      else router.refresh();
    });
  }

  return (
    <div className="mt-4 space-y-3 border-t border-muted-teal/20 pt-4">
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} placeholder={t("notePlaceholder")} className="w-full rounded-lg border border-muted-teal/50 px-3 py-2 text-sm" />
      <label className="flex items-center gap-2 text-sm text-dark-slate/80">
        <input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} />
        {t("creditLabel")}
      </label>
      {error && <p className="text-sm text-watermelon">{error}</p>}
      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => run(false)} disabled={pending} className="rounded-full border border-muted-teal px-4 py-1.5 text-sm font-medium text-dark-slate/70 hover:border-dark-slate/40 disabled:opacity-50">
          {t("decline")}
        </button>
        <button type="button" onClick={() => run(true)} disabled={pending} className="rounded-full bg-coral px-4 py-1.5 text-sm font-semibold text-white hover:bg-watermelon disabled:opacity-50">
          {pending ? t("saving") : t("accept")}
        </button>
      </div>
    </div>
  );
}

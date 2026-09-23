"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { addPilotLogEntry, summarizeResults } from "./actions";

// The pilot as it runs: the success criteria, a log anyone on the team
// can add a dated lesson to, and the results — which the AI can draft
// from the log and the impact values when asked.
export default function PilotSection({
  slug,
  successCriteria,
  log,
  results,
  canLog,
  canEdit,
  aiAvailable,
}: {
  slug: string;
  successCriteria: string | null;
  log: string | null;
  results: string | null;
  canLog: boolean;
  canEdit: boolean;
  aiAvailable: boolean;
}) {
  const t = useTranslations("LanseringOverview");
  const router = useRouter();
  const [entry, setEntry] = useState("");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const logLines = (log ?? "").split("\n").filter((l) => l.trim());

  function act(fn: () => Promise<{ error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        after?.();
        router.refresh();
      }
    });
  }

  const block = (label: string, body: React.ReactNode) => (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{label}</h3>
      <div className="mt-1 text-sm text-dark-slate/80">{body}</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {block(t("criteriaLabel"), successCriteria ? <p className="whitespace-pre-line">{successCriteria}</p> : <p className="text-dark-slate/50">{t("criteriaEmpty")}</p>)}

      {block(
        t("logLabel"),
        <>
          {logLines.length ? (
            <ul className="flex flex-col gap-1">
              {logLines.map((l, i) => (
                <li key={i} className="rounded-md bg-dry-sage/15 px-3 py-1.5">
                  {l}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-dark-slate/50">{t("logEmpty")}</p>
          )}
          {canLog && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act(() => addPilotLogEntry(slug, entry), () => setEntry(""));
              }}
              className="mt-2 flex flex-col gap-2 sm:flex-row"
            >
              <input
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder={t("logPlaceholder")}
                aria-label={t("logPlaceholder")}
                className="flex-1 rounded-md border border-muted-teal px-3 py-1.5 text-sm"
              />
              <button type="submit" disabled={pending || !entry.trim()} className="rounded-lg bg-seagrass px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
                {t("logAdd")}
              </button>
            </form>
          )}
        </>,
      )}

      {block(
        t("resultsLabel"),
        <>
          {results ? <p className="whitespace-pre-line">{results}</p> : <p className="text-dark-slate/50">{t("resultsEmpty")}</p>}
          {canEdit && aiAvailable && logLines.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {results && confirmReplace ? (
                <>
                  <span className="text-xs text-dark-slate/60">{t("replaceQuestion")}</span>
                  <button type="button" disabled={pending} onClick={() => act(() => summarizeResults(slug, true), () => setConfirmReplace(false))} className="text-xs font-semibold text-watermelon disabled:opacity-60">
                    {pending ? t("summarizing") : t("replaceYes")}
                  </button>
                  <button type="button" onClick={() => setConfirmReplace(false)} className="text-xs text-dark-slate/50">
                    {t("cancel")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => (results ? setConfirmReplace(true) : act(() => summarizeResults(slug, false)))}
                  className="rounded-lg border border-seagrass/60 px-3 py-1.5 text-sm font-medium text-seagrass hover:bg-seagrass/10 disabled:opacity-60"
                >
                  {pending ? t("summarizing") : results ? t("summarizeAgain") : t("summarize")}
                </button>
              )}
            </div>
          )}
        </>,
      )}
      {error && <p className="text-sm text-watermelon">{error}</p>}
    </div>
  );
}

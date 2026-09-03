"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { addInterviewLogEntry, deleteInterviewLogEntry } from "./actions";

interface EntryItem {
  id: string;
  date: Date | string;
  personaName: string;
  painPoint: string;
  validated: boolean;
  quotes: string | null;
  createdBy: { id: string; name: string | null };
}

interface Props {
  projectSlug: string;
  entries: EntryItem[];
  canLog: boolean;
  currentUserId: string | null;
}

export default function InterviewLogTable({ projectSlug, entries: initialEntries, canLog, currentUserId }: Props) {
  const t = useTranslations("InterviewLogPage");
  const [entries, setEntries] = useState(initialEntries);
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const personaRef = useRef<HTMLInputElement>(null);
  const painPointRef = useRef<HTMLTextAreaElement>(null);
  const validatedRef = useRef<HTMLInputElement>(null);
  const quotesRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const date = dateRef.current?.value ?? "";
    const personaName = personaRef.current?.value.trim() ?? "";
    const painPoint = painPointRef.current?.value.trim() ?? "";
    const validated = validatedRef.current?.checked ?? false;
    const quotes = quotesRef.current?.value.trim() ?? "";
    if (!date || !personaName || !painPoint) return;

    startTransition(async () => {
      const result = await addInterviewLogEntry(projectSlug, { date, personaName, painPoint, validated, quotes });
      if (result && "entry" in result && result.entry) {
        setEntries((prev) => [result.entry as EntryItem, ...prev]);
        if (dateRef.current) dateRef.current.value = "";
        if (personaRef.current) personaRef.current.value = "";
        if (painPointRef.current) painPointRef.current.value = "";
        if (validatedRef.current) validatedRef.current.checked = false;
        if (quotesRef.current) quotesRef.current.value = "";
        setShowForm(false);
      }
    });
  }

  function handleDelete(entryId: string) {
    startTransition(async () => {
      const result = await deleteInterviewLogEntry(entryId);
      if (result && "ok" in result && result.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== entryId));
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-dark-slate">{t("heading")}</h1>
        {canLog && (
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="bg-coral text-white text-xs font-medium px-3 py-1.5 rounded hover:bg-watermelon transition-colors"
          >
            {showForm ? t("cancelButton") : t("addButton")}
          </button>
        )}
      </div>

      {showForm && canLog && (
        <form onSubmit={handleSubmit} className="border border-muted-teal/30 rounded-lg bg-white p-4 mb-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-dark-slate mb-1">{t("dateLabel")}</label>
              <input ref={dateRef} type="date" required className="w-full border border-muted-teal rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-slate mb-1">{t("personaLabel")}</label>
              <input ref={personaRef} type="text" required placeholder={t("personaPlaceholder")} className="w-full border border-muted-teal rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-slate mb-1">{t("painPointLabel")}</label>
            <textarea ref={painPointRef} required rows={2} placeholder={t("painPointPlaceholder")} className="w-full border border-muted-teal rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-slate mb-1">{t("quotesLabel")}</label>
            <textarea ref={quotesRef} rows={2} placeholder={t("quotesPlaceholder")} className="w-full border border-muted-teal rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm text-dark-slate/80 cursor-pointer w-fit">
            <input ref={validatedRef} type="checkbox" className="accent-seagrass w-4 h-4" />
            {t("validatedLabel")}
          </label>
          <div className="flex justify-end">
            <button type="submit" disabled={pending} className="bg-dark-slate text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
              {t("saveButton")}
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-dark-slate/40 italic">{t("emptyState")}</p>
      ) : (
        <div className="overflow-x-auto border border-muted-teal/30 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted-teal/10 text-left text-xs text-dark-slate/50 uppercase tracking-wide">
                <th className="px-3 py-2">{t("columnDate")}</th>
                <th className="px-3 py-2">{t("columnPersona")}</th>
                <th className="px-3 py-2">{t("columnPainPoint")}</th>
                <th className="px-3 py-2">{t("columnValidated")}</th>
                <th className="px-3 py-2">{t("columnQuotes")}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t border-muted-teal/20 align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-dark-slate/80">
                    {new Date(entry.date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 font-medium text-dark-slate">{entry.personaName}</td>
                  <td className="px-3 py-2 text-dark-slate/80 whitespace-pre-wrap max-w-xs">{entry.painPoint}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${entry.validated ? "bg-seagrass/15 text-seagrass" : "bg-dark-slate/10 text-dark-slate/50"}`}>
                      {entry.validated ? t("validatedYes") : t("validatedNo")}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-dark-slate/60 whitespace-pre-wrap max-w-xs italic">{entry.quotes ?? ""}</td>
                  <td className="px-3 py-2 text-right">
                    {entry.createdBy.id === currentUserId && (
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={pending}
                        className="text-[10px] font-medium text-dark-slate/40 hover:text-coral transition-colors"
                      >
                        {t("removeButton")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

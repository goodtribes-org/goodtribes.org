"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { addMarketScanEntry, deleteMarketScanEntry } from "./actions";
import type { MarketScanEntryType } from "@prisma/client";

const TYPES: MarketScanEntryType[] = ["COMPETITOR", "TREND", "PARTNER_PROSPECT", "REGULATION"];

interface EntryItem {
  id: string;
  type: MarketScanEntryType;
  name: string;
  description: string;
  relevanceNote: string | null;
  sourceUrl: string | null;
  createdBy: { id: string; name: string | null };
}

interface Props {
  projectSlug: string;
  entries: EntryItem[];
  canAdd: boolean;
  currentUserId: string | null;
}

const TYPE_BADGE_CLASS: Record<MarketScanEntryType, string> = {
  COMPETITOR: "bg-watermelon/15 text-watermelon",
  TREND: "bg-seagrass/15 text-seagrass",
  PARTNER_PROSPECT: "bg-coral/15 text-coral",
  REGULATION: "bg-dark-slate/10 text-dark-slate/60",
};

export default function MarketScanList({ projectSlug, entries: initialEntries, canAdd, currentUserId }: Props) {
  const t = useTranslations("MarketScanPage");
  const [entries, setEntries] = useState(initialEntries);
  const [filter, setFilter] = useState<MarketScanEntryType | "ALL">("ALL");
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const typeRef = useRef<HTMLSelectElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const relevanceRef = useRef<HTMLTextAreaElement>(null);
  const sourceUrlRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const type = typeRef.current?.value ?? "";
    const name = nameRef.current?.value.trim() ?? "";
    const description = descriptionRef.current?.value.trim() ?? "";
    const relevanceNote = relevanceRef.current?.value.trim() ?? "";
    const sourceUrl = sourceUrlRef.current?.value.trim() ?? "";
    if (!type || !name || !description) return;

    startTransition(async () => {
      const result = await addMarketScanEntry(projectSlug, { type, name, description, relevanceNote, sourceUrl });
      if (result && "entry" in result && result.entry) {
        setEntries((prev) => [result.entry as EntryItem, ...prev]);
        if (nameRef.current) nameRef.current.value = "";
        if (descriptionRef.current) descriptionRef.current.value = "";
        if (relevanceRef.current) relevanceRef.current.value = "";
        if (sourceUrlRef.current) sourceUrlRef.current.value = "";
        setShowForm(false);
      }
    });
  }

  function handleDelete(entryId: string) {
    startTransition(async () => {
      const result = await deleteMarketScanEntry(entryId);
      if (result && "ok" in result && result.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== entryId));
      }
    });
  }

  const visibleEntries = filter === "ALL" ? entries : entries.filter((e) => e.type === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-dark-slate">{t("heading")}</h1>
        {canAdd && (
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="bg-coral text-white text-xs font-medium px-3 py-1.5 rounded hover:bg-watermelon transition-colors"
          >
            {showForm ? t("cancelButton") : t("addButton")}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${filter === "ALL" ? "bg-dark-slate text-white border-dark-slate" : "border-muted-teal/40 text-dark-slate/60 hover:border-dark-slate/40"}`}
        >
          {t("filterAll")}
        </button>
        {TYPES.map((ty) => (
          <button
            key={ty}
            type="button"
            onClick={() => setFilter(ty)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${filter === ty ? "bg-dark-slate text-white border-dark-slate" : "border-muted-teal/40 text-dark-slate/60 hover:border-dark-slate/40"}`}
          >
            {t(`type_${ty}`)}
          </button>
        ))}
      </div>

      {showForm && canAdd && (
        <form onSubmit={handleSubmit} className="border border-muted-teal/30 rounded-lg bg-white p-4 mb-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-dark-slate mb-1">{t("typeLabel")}</label>
              <select ref={typeRef} required defaultValue="COMPETITOR" className="w-full border border-muted-teal rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coral">
                {TYPES.map((ty) => (
                  <option key={ty} value={ty}>{t(`type_${ty}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-slate mb-1">{t("nameLabel")}</label>
              <input ref={nameRef} type="text" required placeholder={t("namePlaceholder")} className="w-full border border-muted-teal rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-slate mb-1">{t("descriptionLabel")}</label>
            <textarea ref={descriptionRef} required rows={2} placeholder={t("descriptionPlaceholder")} className="w-full border border-muted-teal rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-slate mb-1">{t("relevanceLabel")}</label>
            <textarea ref={relevanceRef} rows={2} placeholder={t("relevancePlaceholder")} className="w-full border border-muted-teal rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-slate mb-1">{t("sourceUrlLabel")}</label>
            <input ref={sourceUrlRef} type="url" placeholder="https://…" className="w-full border border-muted-teal rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral" />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={pending} className="bg-dark-slate text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
              {t("saveButton")}
            </button>
          </div>
        </form>
      )}

      {visibleEntries.length === 0 ? (
        <p className="text-sm text-dark-slate/40 italic">{t("emptyState")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleEntries.map((entry) => (
            <div key={entry.id} className="border border-muted-teal/30 rounded-lg bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE_CLASS[entry.type]}`}>
                    {t(`type_${entry.type}`)}
                  </span>
                  <span className="text-sm font-semibold text-dark-slate">{entry.name}</span>
                </div>
                {entry.createdBy.id === currentUserId && (
                  <button
                    onClick={() => handleDelete(entry.id)}
                    disabled={pending}
                    className="text-[10px] font-medium text-dark-slate/40 hover:text-coral shrink-0 transition-colors"
                  >
                    {t("removeButton")}
                  </button>
                )}
              </div>
              <p className="text-xs text-dark-slate/80 whitespace-pre-wrap mt-1.5">{entry.description}</p>
              {entry.relevanceNote && (
                <p className="text-xs text-dark-slate/50 whitespace-pre-wrap mt-1 italic">{entry.relevanceNote}</p>
              )}
              {entry.sourceUrl && (
                <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-block text-xs text-seagrass hover:underline mt-1.5">
                  {t("sourceLinkLabel")}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import RichTextEditor from "@/components/RichTextEditor";
import { suggestProjectTranslation, upsertProjectTranslation, type TranslationDraft } from "./translation-actions";

// Only rendered when editing from the default (sv) locale — translating
// FROM sv INTO en, matching upsertProjectTranslation's own invariant
// (locale === routing.defaultLocale is rejected server-side).
export default function TranslationSuggestPanel({
  projectId,
  existing,
}: {
  projectId: string;
  existing: TranslationDraft | null;
}) {
  const t = useTranslations("TranslationSuggestPanel");
  const [draft, setDraft] = useState<TranslationDraft | null>(existing);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isGenerating, startGenerating] = useTransition();
  const [isSaving, startSaving] = useTransition();

  function handleGenerate() {
    setError(null);
    setSaved(false);
    startGenerating(async () => {
      const res = await suggestProjectTranslation(projectId);
      if ("error" in res) { setError(res.error); return; }
      setDraft(res.draft);
    });
  }

  function handleSave() {
    if (!draft) return;
    setError(null);
    startSaving(async () => {
      const res = await upsertProjectTranslation(projectId, "en", draft);
      if ("error" in res) { setError(res.error); return; }
      setSaved(true);
    });
  }

  return (
    <div className="border border-muted-teal/30 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 mb-1">
        <p className="text-sm font-semibold text-dark-slate">{t("heading")}</p>
        <button
          type="button"
          disabled={isGenerating}
          onClick={handleGenerate}
          className="text-xs font-medium text-white bg-seagrass hover:bg-seagrass/90 rounded-md px-3 py-1.5 transition-colors disabled:opacity-60 flex-shrink-0"
        >
          {isGenerating ? t("generatingButton") : draft ? t("regenerateButton") : t("generateButton")}
        </button>
      </div>
      <p className="text-xs text-dark-slate/60 mb-3">{t("hint")}</p>

      {error && <p className="text-xs text-coral mb-3">{error}</p>}

      {draft && (
        <div className="space-y-3">
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder={t("titlePlaceholder")}
            className="w-full text-sm border border-muted-teal/30 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-seagrass/40"
          />
          <textarea
            value={draft.summary ?? ""}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder={t("summaryPlaceholder")}
            rows={2}
            className="w-full text-sm border border-muted-teal/30 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-seagrass/40 resize-none"
          />
          <RichTextEditor content={draft.description ?? ""} onChange={(html) => setDraft({ ...draft, description: html })} />

          <div className="flex items-center justify-end gap-3">
            {saved && !isSaving && <span className="text-xs text-seagrass">{t("savedNotice")}</span>}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-dark-slate text-white hover:bg-dark-slate/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? t("savingButton") : t("saveButton")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

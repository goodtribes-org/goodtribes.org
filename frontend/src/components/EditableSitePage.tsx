"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import RichTextEditor from "@/components/RichTextEditor";
import { updateSitePage } from "@/app/[locale]/site-pages-actions";
import type { Locale } from "next-intl";

interface Props {
  slug: string;
  locale: Locale;
  canEdit: boolean;
  title: string;
  body: string;
  titleClassName?: string;
}

export default function EditableSitePage({ slug, locale, canEdit, title, body, titleClassName }: Props) {
  const t = useTranslations("SitePageEditor");
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftBody, setDraftBody] = useState(body);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateSitePage(slug, locale, draftTitle, draftBody);
      if ("error" in result) { setError(result.error); return; }
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="max-w-2xl space-y-3">
        <input
          type="text"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          maxLength={200}
          className={`w-full font-bold border-b border-muted-teal focus:outline-none focus:border-coral pb-1 bg-transparent ${titleClassName ?? "text-3xl"}`}
        />
        <RichTextEditor content={draftBody} onChange={setDraftBody} />
        {error && <p className="text-sm text-watermelon">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="bg-coral text-white text-sm font-medium px-4 py-1.5 rounded hover:bg-watermelon disabled:opacity-50 transition-colors"
          >
            {isPending ? t("saving") : t("save")}
          </button>
          <button
            type="button"
            onClick={() => { setDraftTitle(title); setDraftBody(body); setError(null); setEditing(false); }}
            className="text-sm text-dark-slate/50 px-3 py-1.5 rounded hover:text-dark-slate transition-colors"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className={`font-bold text-dark-slate min-w-0 break-words ${titleClassName ?? "text-3xl"}`}>{title}</h1>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            title={t("editPage")}
            className="shrink-0 text-xs text-dark-slate/40 hover:text-dark-slate border border-muted-teal/40 px-3 py-1 rounded transition-colors"
          >
            ✎ {t("edit")}
          </button>
        )}
      </div>
      <article
        className="prose prose-sm max-w-none text-dark-slate/80 leading-relaxed
          prose-headings:text-dark-slate
          prose-a:text-coral prose-a:no-underline hover:prose-a:underline
          prose-strong:text-dark-slate"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </div>
  );
}

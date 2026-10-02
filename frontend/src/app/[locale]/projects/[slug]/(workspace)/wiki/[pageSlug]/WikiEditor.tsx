"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import RichTextEditor from "@/components/RichTextEditor";

interface Props {
  page: { id: string; title: string; content: string; parentId: string | null };
  projectSlug: string;
  canEdit: boolean;
  canDelete: boolean;
  renderedHtml: string;
  updateAction: (id: string, projectSlug: string, formData: FormData) => Promise<void>;
  deleteAction: (id: string, projectSlug: string) => Promise<void>;
  parentOptions: { id: string; title: string }[];
}

// Older pages were written in a plain-text/markdown-lite format (# Heading,
// - list item) instead of real HTML. Wrap each non-blank line in a <p> so
// line breaks survive the first time such a page is opened in the rich text
// editor — once saved it becomes real HTML like any other page.
function toEditableHtml(raw: string): string {
  if (raw.trimStart().startsWith("<")) return raw;
  return raw
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => `<p>${line}</p>`)
    .join("");
}

export default function WikiEditor({ page, projectSlug, canEdit, canDelete, renderedHtml, updateAction, deleteAction, parentOptions }: Props) {
  const t = useTranslations("WikiEditor");
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(() => toEditableHtml(page.content));
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(async () => {
      await updateAction(page.id, projectSlug, formData);
      setEditing(false);
    });
  }

  function handleDelete() {
    if (!confirm(t("confirmDelete"))) return;
    startDeleting(async () => {
      await deleteAction(page.id, projectSlug);
    });
  }

  if (editing) {
    return (
      <form action={handleSave} className="space-y-3">
        <input
          name="title"
          type="text"
          required
          maxLength={200}
          defaultValue={page.title}
          className="w-full text-xl font-bold border-b border-muted-teal focus:outline-none focus:border-coral pb-1 bg-white"
        />
        <input type="hidden" name="content" value={content} />
        <RichTextEditor content={content} onChange={setContent} />
        <div>
          <label className="block text-xs text-dark-slate/50 mb-1">{t("parentPageLabel")}</label>
          <select
            name="parentId"
            defaultValue={page.parentId ?? ""}
            className="w-full sm:w-64 text-sm border border-muted-teal rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-coral bg-white"
          >
            <option value="">{t("noneTopLevelOption")}</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="bg-coral text-white text-sm font-medium px-4 py-1.5 rounded hover:bg-watermelon disabled:opacity-50 transition-colors"
          >
            {isPending ? t("saving") : t("save")}
          </button>
          <button
            type="button"
            onClick={() => { setContent(toEditableHtml(page.content)); setEditing(false); }}
            className="text-sm text-dark-slate/50 px-3 py-1.5 rounded hover:text-dark-slate transition-colors"
          >
            {t("cancel")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <h1 className="text-xl font-bold text-dark-slate min-w-0 break-words">{page.title}</h1>
        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-dark-slate/50 hover:text-dark-slate border border-muted-teal/40 px-3 py-1 rounded transition-colors"
            >
              {t("edit")}
            </button>
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-xs text-dark-slate/30 hover:text-watermelon disabled:opacity-50 transition-colors"
              >
                {t("delete")}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white border border-muted-teal/30 rounded-xl p-6">
        {page.content ? (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        ) : (
          <p className="text-sm text-dark-slate/40 italic">
            {canEdit ? t("emptyEditable") : t("emptyReadonly")}
          </p>
        )}
      </div>
    </div>
  );
}

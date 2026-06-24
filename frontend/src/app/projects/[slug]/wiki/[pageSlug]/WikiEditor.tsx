"use client";

import { useState, useTransition } from "react";

interface Props {
  page: { id: string; title: string; content: string };
  projectSlug: string;
  canEdit: boolean;
  canDelete: boolean;
  renderedHtml: string;
  updateAction: (id: string, projectSlug: string, formData: FormData) => Promise<void>;
  deleteAction: (id: string, projectSlug: string) => Promise<void>;
}

export default function WikiEditor({ page, projectSlug, canEdit, canDelete, renderedHtml, updateAction, deleteAction }: Props) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(async () => {
      await updateAction(page.id, projectSlug, formData);
      setEditing(false);
    });
  }

  function handleDelete() {
    if (!confirm("Delete this page? This cannot be undone.")) return;
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
          defaultValue={page.title}
          className="w-full text-xl font-bold border-b border-muted-teal focus:outline-none focus:border-coral pb-1 bg-transparent"
        />
        <textarea
          name="content"
          rows={20}
          defaultValue={page.content}
          placeholder="Write in plain text. # Heading  ## Subheading  - list item"
          className="w-full border border-muted-teal rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-coral resize-y"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="bg-coral text-white text-sm font-medium px-4 py-1.5 rounded hover:bg-watermelon disabled:opacity-50 transition-colors"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-sm text-dark-slate/50 px-3 py-1.5 rounded hover:text-dark-slate transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <h1 className="text-xl font-bold text-dark-slate">{page.title}</h1>
        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-dark-slate/50 hover:text-dark-slate border border-muted-teal/40 px-3 py-1 rounded transition-colors"
            >
              Edit
            </button>
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-xs text-dark-slate/30 hover:text-watermelon disabled:opacity-50 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {page.content ? (
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      ) : (
        <p className="text-sm text-dark-slate/40 italic">
          {canEdit ? "This page is empty. Click Edit to add content." : "No content yet."}
        </p>
      )}
    </div>
  );
}

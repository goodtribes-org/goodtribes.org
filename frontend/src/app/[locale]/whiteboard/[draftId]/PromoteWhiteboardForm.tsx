"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { promoteWhiteboardDraftToProject } from "../actions";

export default function PromoteWhiteboardForm({ draftId }: { draftId: string }) {
  const t = useTranslations("WhiteboardDraftPage");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await promoteWhiteboardDraftToProject(draftId, formData);
      if ("slug" in result) {
        router.push(`/projects/${result.slug}/sprints`);
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors"
      >
        {t("promoteButton")}
      </button>
    );
  }

  return (
    <div>
      <form action={handleSubmit} className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          name="title"
          placeholder={t("promoteTitlePlaceholder")}
          required
          autoFocus
          className="border border-muted-teal rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral min-w-0 flex-1"
        />
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-1.5 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon disabled:opacity-50 transition-colors flex-shrink-0"
        >
          {pending ? t("promoting") : t("promoteConfirm")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-dark-slate/50 hover:text-dark-slate transition-colors flex-shrink-0"
        >
          {t("promoteCancel")}
        </button>
      </form>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}

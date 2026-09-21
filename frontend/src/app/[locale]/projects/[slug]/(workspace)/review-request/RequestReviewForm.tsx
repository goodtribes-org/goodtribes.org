"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { requestCouncilReview } from "@/lib/actions/reviewCouncilRequests";

export default function RequestReviewForm({ projectSlug }: { projectSlug: string }) {
  const t = useTranslations("ReviewRequestPage");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await requestCouncilReview(projectSlug, note.trim() || null);
        setNote("");
        router.refresh();
      } catch {
        setError(t("genericError"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="border border-muted-teal/40 rounded-lg p-4 bg-white space-y-3">
      <div>
        <label className="block text-xs font-medium text-dark-slate/60 mb-1">{t("noteLabel")}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass resize-none"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="bg-coral text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon transition-colors disabled:opacity-50"
      >
        {isPending ? t("submitting") : t("submitButton")}
      </button>
    </form>
  );
}

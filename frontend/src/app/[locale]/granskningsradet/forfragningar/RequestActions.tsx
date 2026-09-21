"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { assignReviewRequest, completeReviewRequest, declineReviewRequest } from "@/lib/actions/reviewCouncilRequests";

export default function RequestActions({
  requestId,
  isAssignedToMe,
  assignedToName,
}: {
  requestId: string;
  isAssignedToMe: boolean;
  assignedToName: string | null;
}) {
  const t = useTranslations("ReviewCouncilRequestsPage");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [outcomeNote, setOutcomeNote] = useState("");

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  if (!assignedToName) {
    return (
      <button
        onClick={() => run(() => assignReviewRequest(requestId))}
        disabled={isPending}
        className="text-sm font-medium text-seagrass hover:underline disabled:opacity-50"
      >
        {t("assignToMe")}
      </button>
    );
  }

  if (!isAssignedToMe) {
    return <p className="text-xs text-dark-slate/40">{t("assignedTo", { name: assignedToName })}</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-dark-slate/40">{t("assignedToYou")}</p>
      <textarea
        value={outcomeNote}
        onChange={(e) => setOutcomeNote(e.target.value)}
        rows={2}
        placeholder={t("outcomeNotePlaceholder")}
        className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass resize-none"
      />
      <div className="flex gap-3">
        <button
          onClick={() => run(() => completeReviewRequest(requestId, outcomeNote))}
          disabled={isPending}
          className="bg-coral text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-watermelon transition-colors disabled:opacity-50"
        >
          {t("markCompleted")}
        </button>
        <button
          onClick={() => run(() => declineReviewRequest(requestId, outcomeNote))}
          disabled={isPending}
          className="text-xs font-medium text-dark-slate/60 hover:text-dark-slate disabled:opacity-50"
        >
          {t("decline")}
        </button>
      </div>
    </div>
  );
}

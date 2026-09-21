"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestPlanRevision, approveAiProjectPlan } from "./actions";

const MAX_REVISIONS = 3;

export default function PlanReviewActions({
  planId,
  roomId,
  revisionCount,
}: {
  planId: string;
  roomId: string;
  revisionCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [revisionNote, setRevisionNote] = useState("");
  const [continueWithAi, setContinueWithAi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Något gick fel");
      }
    });
  }

  return (
    <div className="border-t border-muted-teal/20 pt-6">
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm text-dark-slate/70">
          <input
            type="radio"
            name="continueWithAi"
            checked={!continueWithAi}
            onChange={() => setContinueWithAi(false)}
          />
          Jag tar det härifrån själv
        </label>
        <label className="flex items-center gap-2 text-sm text-dark-slate/70 mt-1">
          <input
            type="radio"
            name="continueWithAi"
            checked={continueWithAi}
            onChange={() => setContinueWithAi(true)}
          />
          Vill du att AI fortsätter hjälpa till genom projektets faser?
        </label>
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={() => run(() => approveAiProjectPlan(planId, roomId, continueWithAi))}
        className="bg-coral text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon transition-colors disabled:opacity-50 mb-6"
      >
        {isPending ? "Skapar…" : "Godkänn och skapa projekt"}
      </button>

      {revisionCount >= MAX_REVISIONS ? (
        <p className="text-xs text-dark-slate/40">
          Max antal omarbetningar ({MAX_REVISIONS}) nått för den här planen.
        </p>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-dark-slate/60">
            Be AI ändra något ({revisionCount}/{MAX_REVISIONS} omarbetningar hittills)
          </label>
          <textarea
            value={revisionNote}
            onChange={(e) => setRevisionNote(e.target.value)}
            rows={2}
            placeholder="T.ex. 'Fokusera mer på ungdomar' eller 'Lägg till fler startuppgifter'"
            className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm resize-none"
          />
          <button
            type="button"
            disabled={isPending || !revisionNote.trim()}
            onClick={() => run(async () => {
              await requestPlanRevision(roomId, revisionNote.trim());
              setRevisionNote("");
              router.refresh();
            })}
            className="text-sm font-medium text-dark-slate/60 hover:text-dark-slate transition-colors disabled:opacity-50"
          >
            Be AI göra om planen
          </button>
        </div>
      )}
    </div>
  );
}

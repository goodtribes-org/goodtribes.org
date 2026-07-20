"use client";

import { useState, useTransition } from "react";
import { proposeDecision, castExclusionVote } from "../../actions";

const DECISIONS: { value: "none" | "warning" | "project_ban" | "platform_ban"; label: string }[] = [
  { value: "none", label: "Ingen åtgärd" },
  { value: "warning", label: "Varning" },
  { value: "project_ban", label: "Uteslutning från projektet" },
  { value: "platform_ban", label: "Uteslutning från hela plattformen" },
];

export function ProposeDecisionForm({ caseId }: { caseId: string }) {
  const [decision, setDecision] = useState<typeof DECISIONS[number]["value"]>("warning");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="border border-muted-teal rounded-lg p-4">
      <p className="text-sm font-medium text-dark-slate mb-2">Föreslå beslut</p>
      <div className="flex flex-col gap-2">
        <select
          value={decision}
          onChange={(e) => setDecision(e.target.value as typeof decision)}
          className="border border-muted-teal rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coral"
        >
          {DECISIONS.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        {error && <p className="text-sm text-watermelon">{error}</p>}
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await proposeDecision(caseId, decision);
              if (result && "error" in result) setError(result.error ?? "Något gick fel.");
            })
          }
          className="self-start bg-coral text-white text-sm font-medium px-4 py-2 rounded hover:bg-watermelon transition-colors disabled:opacity-60"
        >
          {isPending ? "Skickar…" : "Lägg fram förslaget"}
        </button>
      </div>
    </div>
  );
}

export function CastVoteForm({ caseId, myVote }: { caseId: string; myVote: { vote: string; reasoning: string | null } | null }) {
  const [reasoning, setReasoning] = useState(myVote?.reasoning ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function vote(v: "approve" | "reject") {
    setError(null);
    startTransition(async () => {
      const result = await castExclusionVote(caseId, v, reasoning.trim() || undefined);
      if (result && "error" in result) setError(result.error ?? "Något gick fel.");
    });
  }

  return (
    <div className="border border-muted-teal rounded-lg p-4">
      <p className="text-sm font-medium text-dark-slate mb-2">
        {myVote ? "Ändra din röst" : "Rösta på förslaget"}
      </p>
      <textarea
        value={reasoning}
        onChange={(e) => setReasoning(e.target.value)}
        rows={2}
        placeholder="Motivering (valfritt)…"
        className="w-full border border-muted-teal rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-coral resize-none"
      />
      {error && <p className="text-sm text-watermelon mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => vote("approve")}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-60 ${
            myVote?.vote === "approve" ? "bg-green-600 text-white" : "border border-green-300 text-green-700 hover:bg-green-50"
          }`}
        >
          Godkänn
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => vote("reject")}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-60 ${
            myVote?.vote === "reject" ? "bg-red-600 text-white" : "border border-red-300 text-red-600 hover:bg-red-50"
          }`}
        >
          Avslå
        </button>
      </div>
    </div>
  );
}

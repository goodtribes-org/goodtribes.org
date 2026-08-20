"use client";

import { useState, useTransition } from "react";
import { castVote } from "./actions";
import type { SprintContributionType } from "@prisma/client";

const TYPE_LABEL: Record<SprintContributionType, string> = {
  HMW: "How Might We",
  SKETCH: "Skiss",
  PROTOTYPE_LINK: "Prototyplänk",
  FEEDBACK: "Feedback",
};

export type VotingBoard = {
  decidePhaseId: string;
  decidePhaseStatus: string;
  contributions: { id: string; type: SprintContributionType; content: string; voteCount: number }[];
} | null;

export default function DotVoting({
  projectSlug,
  votingBoard,
  remainingVotes,
  canVote,
}: {
  projectSlug: string;
  votingBoard: VotingBoard;
  remainingVotes: number;
  canVote: boolean;
}) {
  const [remaining, setRemaining] = useState(remainingVotes);
  const [votedFor, setVotedFor] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!votingBoard) {
    return <p className="text-sm text-dark-slate/40 italic">Skissa-fasen behöver stängas innan omröstningen kan börja.</p>;
  }

  function handleVote(contributionId: string) {
    if (!canVote || remaining <= 0 || votedFor.has(contributionId)) return;
    setError(null);
    startTransition(async () => {
      const result = await castVote(projectSlug, votingBoard!.decidePhaseId, contributionId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setRemaining((r) => r - 1);
      setVotedFor((prev) => new Set(prev).add(contributionId));
    });
  }

  return (
    <div>
      {canVote && (
        <p className="text-sm text-dark-slate/60 mb-3">
          Du har <span className="font-semibold text-dark-slate">{remaining}</span> av 3 prickar kvar att fördela.
        </p>
      )}
      {error && <p className="text-xs text-watermelon mb-3">{error}</p>}
      <div className="flex flex-col gap-3">
        {votingBoard.contributions.map((c) => (
          <div key={c.id} className="bg-white border border-muted-teal/30 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="text-xs font-medium text-dark-slate/40 uppercase tracking-wide">{TYPE_LABEL[c.type]}</span>
              <p className="text-sm text-dark-slate/80 mt-0.5">{c.content}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-sm font-semibold text-dark-slate">{c.voteCount}</span>
              <button
                type="button"
                disabled={!canVote || isPending || remaining <= 0 || votedFor.has(c.id)}
                onClick={() => handleVote(c.id)}
                className="text-xs font-medium text-white bg-seagrass rounded-full px-3 py-1.5 disabled:opacity-40 transition-colors"
              >
                {votedFor.has(c.id) ? "✓ Röstat" : "Rösta"}
              </button>
            </div>
          </div>
        ))}
        {votingBoard.contributions.length === 0 && (
          <p className="text-sm text-dark-slate/40 italic">Inga skisser att rösta på ännu.</p>
        )}
      </div>
    </div>
  );
}

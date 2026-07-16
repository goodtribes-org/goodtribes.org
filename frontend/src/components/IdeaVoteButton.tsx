"use client";

import { useState, useTransition } from "react";
import { toggleVote } from "@/app/[locale]/ideas/[id]/actions";

export default function IdeaVoteButton({
  ideaId,
  voteCount,
  hasVoted,
  isLoggedIn,
}: {
  ideaId: string;
  voteCount: number;
  hasVoted: boolean;
  isLoggedIn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [votes, setVotes] = useState(voteCount);
  const [voted, setVoted] = useState(hasVoted);

  function handleVote(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) return;
    setVotes((c) => (voted ? c - 1 : c + 1));
    setVoted((v) => !v);
    startTransition(async () => { await toggleVote(ideaId); });
  }

  return (
    <button
      onClick={handleVote}
      disabled={!isLoggedIn || pending}
      title={isLoggedIn ? (voted ? "Ta bort din röst" : "Rösta på idén") : "Logga in för att rösta"}
      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
        voted ? "bg-seagrass text-white border-seagrass" : "border-seagrass/50 text-seagrass hover:bg-seagrass/10"
      } ${!isLoggedIn ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      ▲ {votes}
    </button>
  );
}

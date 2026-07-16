"use client";

import { useTransition } from "react";
import { toggleVote } from "@/app/[locale]/ideas/[id]/actions";
import IdeaVoteButton from "@/components/IdeaVoteButton";

export default function IdeaVoteButtonContainer({
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

  function handleVote() {
    startTransition(async () => { await toggleVote(ideaId); });
  }

  return (
    <IdeaVoteButton
      voteCount={voteCount}
      hasVoted={hasVoted}
      isLoggedIn={isLoggedIn}
      pending={pending}
      onVote={handleVote}
    />
  );
}

"use client";

import { useTransition } from "react";
import { toggleVote } from "@/app/[locale]/ideas/[id]/actions";
import IdeaCard, { type IdeaCardData } from "@/components/IdeaCard";

export default function IdeaCardContainer({
  idea,
  isLoggedIn,
}: {
  idea: IdeaCardData;
  isLoggedIn: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleVote(ideaId: string) {
    startTransition(async () => { await toggleVote(ideaId); });
  }

  return <IdeaCard idea={idea} isLoggedIn={isLoggedIn} onVote={handleVote} votePending={pending} />;
}

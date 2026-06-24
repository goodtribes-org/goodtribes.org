"use client";

import { useRef, useState, useTransition } from "react";
import { toggleVote, addComment } from "./actions";

interface Props {
  ideaId: string;
  voteCount: number;
  hasVoted: boolean;
  isLoggedIn: boolean;
}

export function VoteButton({ ideaId, voteCount, hasVoted, isLoggedIn }: Props) {
  const [pending, startTransition] = useTransition();
  const [optimisticCount, setOptimisticCount] = useState(voteCount);
  const [optimisticVoted, setOptimisticVoted] = useState(hasVoted);

  function handleVote() {
    if (!isLoggedIn) return;
    setOptimisticCount((c) => (optimisticVoted ? c - 1 : c + 1));
    setOptimisticVoted((v) => !v);
    startTransition(async () => { await toggleVote(ideaId); });
  }

  return (
    <button
      onClick={handleVote}
      disabled={!isLoggedIn || pending}
      className={`flex flex-col items-center gap-1 px-5 py-3 rounded-lg border-2 transition-all ${
        optimisticVoted
          ? "border-seagrass bg-seagrass/10 text-seagrass"
          : "border-muted-teal text-dark-slate/60 hover:border-seagrass hover:text-seagrass"
      } ${!isLoggedIn ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      title={isLoggedIn ? (optimisticVoted ? "Remove vote" : "Upvote this idea") : "Log in to vote"}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
      <span className="text-lg font-bold">{optimisticCount}</span>
      <span className="text-[10px] uppercase tracking-wider">votes</span>
    </button>
  );
}

interface CommentFormProps {
  ideaId: string;
}

export function CommentForm({ ideaId }: CommentFormProps) {
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = ref.current?.value ?? "";
    if (!content.trim()) return;
    startTransition(async () => {
      await addComment(ideaId, content);
      if (ref.current) ref.current.value = "";
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        ref={ref}
        rows={3}
        placeholder="Add a comment..."
        className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors disabled:opacity-50"
        >
          {pending ? "Posting..." : "Post comment"}
        </button>
      </div>
    </form>
  );
}

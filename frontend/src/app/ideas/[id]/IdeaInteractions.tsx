"use client";

import { useRef, useState, useTransition } from "react";
import { toggleVote, toggleEndorsement, toggleFollow, setIdeaStatus, addComment } from "./actions";

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "review", label: "Under Review" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "approved", label: "Approved" },
  { value: "converted", label: "Converted" },
];

interface SidebarProps {
  ideaId: string;
  voteCount: number;
  hasVoted: boolean;
  endorseCount: number;
  hasEndorsed: boolean;
  followCount: number;
  hasFollowed: boolean;
  isLoggedIn: boolean;
  isAuthor: boolean;
  isModerator: boolean;
  currentStatus: string;
}

export function IdeaSidebar({
  ideaId, voteCount, hasVoted, endorseCount, hasEndorsed,
  followCount, hasFollowed, isLoggedIn, isAuthor, isModerator, currentStatus,
}: SidebarProps) {
  const [pending, startTransition] = useTransition();
  const [votes, setVotes] = useState(voteCount);
  const [voted, setVoted] = useState(hasVoted);
  const [endorses, setEndorses] = useState(endorseCount);
  const [endorsed, setEndorsed] = useState(hasEndorsed);
  const [follows, setFollows] = useState(followCount);
  const [followed, setFollowed] = useState(hasFollowed);

  function handleVote() {
    if (!isLoggedIn) return;
    setVotes((c) => (voted ? c - 1 : c + 1));
    setVoted((v) => !v);
    startTransition(async () => { await toggleVote(ideaId); });
  }

  function handleEndorse() {
    if (!isLoggedIn) return;
    setEndorses((c) => (endorsed ? c - 1 : c + 1));
    setEndorsed((v) => !v);
    startTransition(async () => { await toggleEndorsement(ideaId); });
  }

  function handleFollow() {
    if (!isLoggedIn) return;
    setFollows((c) => (followed ? c - 1 : c + 1));
    setFollowed((v) => !v);
    startTransition(async () => { await toggleFollow(ideaId); });
  }

  function handleStatus(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    startTransition(async () => { await setIdeaStatus(ideaId, val); });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Vote */}
      <button
        onClick={handleVote}
        disabled={!isLoggedIn || pending}
        title={isLoggedIn ? (voted ? "Remove vote" : "Upvote this idea") : "Log in to vote"}
        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 transition-all ${
          voted
            ? "border-seagrass bg-seagrass/10 text-seagrass"
            : "border-muted-teal text-dark-slate/60 hover:border-seagrass hover:text-seagrass"
        } ${!isLoggedIn ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <svg className="w-5 h-5" fill={voted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
        <span className="text-xl font-bold">{votes}</span>
        <span className="text-[10px] uppercase tracking-wider">votes</span>
      </button>

      {/* Endorse */}
      <button
        onClick={handleEndorse}
        disabled={!isLoggedIn || pending}
        title={isLoggedIn ? (endorsed ? "Remove endorsement" : "I'd work on this") : "Log in to endorse"}
        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 transition-all ${
          endorsed
            ? "border-coral bg-coral/10 text-coral"
            : "border-muted-teal text-dark-slate/60 hover:border-coral hover:text-coral"
        } ${!isLoggedIn ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-xl font-bold">{endorses}</span>
        <span className="text-[10px] uppercase tracking-wider text-center leading-tight">I'd contribute</span>
      </button>

      {/* Follow */}
      <button
        onClick={handleFollow}
        disabled={!isLoggedIn || pending}
        title={isLoggedIn ? (followed ? "Unfollow" : "Follow for updates") : "Log in to follow"}
        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 transition-all ${
          followed
            ? "border-purple-400 bg-purple-50 text-purple-600"
            : "border-muted-teal text-dark-slate/60 hover:border-purple-400 hover:text-purple-600"
        } ${!isLoggedIn ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <svg className="w-5 h-5" fill={followed ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span className="text-xl font-bold">{follows}</span>
        <span className="text-[10px] uppercase tracking-wider">following</span>
      </button>

      {/* Status change (author + moderator) */}
      {(isAuthor || isModerator) && (
        <div className="mt-1">
          <label className="text-[10px] text-dark-slate/50 uppercase tracking-wider block mb-1">Status</label>
          <select
            defaultValue={currentStatus}
            onChange={handleStatus}
            disabled={pending}
            className="w-full text-xs border border-muted-teal rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-coral"
          >
            {STATUSES.filter(s =>
              isModerator || ["draft", "open"].includes(s.value)
            ).map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
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
        placeholder="Share your thoughts, ask questions, or suggest improvements..."
        className="w-full border border-muted-teal rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-coral text-white text-sm font-medium rounded-lg hover:bg-watermelon transition-colors disabled:opacity-50"
        >
          {pending ? "Posting..." : "Post comment"}
        </button>
      </div>
    </form>
  );
}

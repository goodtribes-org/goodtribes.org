"use client";

import { useRef, useState, useTransition } from "react";
import { toggleFeedLike, addFeedComment } from "@/app/actions";

type Comment = { id: string; author: string; body: string; timeAgo: string };

export default function FeedItemActions({
  targetType,
  targetId,
  isLoggedIn,
  initialLikeCount,
  initialLiked,
  initialComments,
}: {
  targetType: string;
  targetId: string;
  isLoggedIn: boolean;
  initialLikeCount: number;
  initialLiked: boolean;
  initialComments: Comment[];
}) {
  const [, startTransition] = useTransition();
  const [pendingComment, setPendingComment] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(initialLiked);
  const [comments, setComments] = useState(initialComments);
  const [showComments, setShowComments] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  function handleLike() {
    if (!isLoggedIn) return;
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    setLiked((v) => !v);
    startTransition(async () => { await toggleFeedLike(targetType, targetId); });
  }

  function handleComment(e: React.FormEvent) {
    e.preventDefault();
    const body = ref.current?.value ?? "";
    if (!body.trim() || !isLoggedIn) return;
    setComments((c) => [...c, { id: `tmp-${c.length}`, author: "Du", body, timeAgo: "just nu" }]);
    if (ref.current) ref.current.value = "";
    setPendingComment(true);
    startTransition(async () => {
      await addFeedComment(targetType, targetId, body);
      setPendingComment(false);
    });
  }

  return (
    <div className="mt-2 pt-2 border-t border-muted-teal/20">
      <div className="flex items-center gap-4">
        <button
          onClick={handleLike}
          disabled={!isLoggedIn}
          title={isLoggedIn ? (liked ? "Ta bort gillning" : "Gilla") : "Logga in för att gilla"}
          className={`flex items-center gap-1 text-xs font-medium transition-colors ${
            liked ? "text-coral" : "text-dark-slate/50 hover:text-coral"
          } ${!isLoggedIn ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-8.53a2 2 0 01-2-2v-7a2 2 0 012-2h2.5m4-6l-1 5h6a1 1 0 011 1v1m-7-7v7m0-7L9 4" />
          </svg>
          Gilla{likeCount > 0 ? ` (${likeCount})` : ""}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-dark-slate/50 hover:text-seagrass transition-colors cursor-pointer"
        >
          💬 Kommentera{comments.length > 0 ? ` (${comments.length})` : ""}
        </button>
      </div>

      {showComments && (
        <div className="mt-2 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="bg-dry-sage/10 rounded-lg px-2.5 py-1.5">
              <p className="text-[11px]">
                <span className="font-semibold text-dark-slate">{c.author}</span>{" "}
                <span className="text-dark-slate/40">· {c.timeAgo}</span>
              </p>
              <p className="text-xs text-dark-slate/80 mt-0.5">{c.body}</p>
            </div>
          ))}
          {isLoggedIn ? (
            <form onSubmit={handleComment} className="flex gap-2">
              <textarea
                ref={ref}
                rows={1}
                placeholder="Skriv en kommentar..."
                className="flex-1 border border-muted-teal rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-coral resize-none"
              />
              <button
                type="submit"
                disabled={pendingComment}
                className="px-3 py-1.5 bg-coral text-white text-xs font-medium rounded-lg hover:bg-watermelon transition-colors disabled:opacity-50"
              >
                Skicka
              </button>
            </form>
          ) : (
            <p className="text-[11px] text-dark-slate/40">Logga in för att kommentera.</p>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { addComment, toggleCardLike } from "@/app/[locale]/projects/[slug]/(workspace)/kanban/actions";
import { htmlToPreviewText } from "@/lib/renderBody";
import { timeAgo, type Card, type Comment } from "./kanbanShared";

function KanbanCardCommentsImpl({
  card,
  isLoggedIn,
  isMember,
  onSaved,
}: {
  card: Card;
  isLoggedIn: boolean;
  isMember: boolean;
  onSaved: (cardId: string, patch: Partial<Card>) => void;
}) {
  const [comments, setComments] = useState<Comment[]>(card.comments ?? []);
  const [showComments, setShowComments] = useState(false);
  const [pendingComment, setPendingComment] = useState(false);
  const [liked, setLiked] = useState(!!card.likedByMe);
  const [likeCount, setLikeCount] = useState(card.likeCount ?? 0);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setComments(card.comments ?? []); }, [card.comments]);
  useEffect(() => { setLiked(!!card.likedByMe); setLikeCount(card.likeCount ?? 0); }, [card.likedByMe, card.likeCount]);

  const canInteract = isLoggedIn && isMember;

  function handleLike() {
    if (!canInteract) return;
    const nextLiked = !liked;
    const nextCount = likeCount + (liked ? -1 : 1);
    setLikeCount(nextCount);
    setLiked(nextLiked);
    onSaved(card.id, { likedByMe: nextLiked, likeCount: nextCount });
    startTransition(async () => { await toggleCardLike(card.id); });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = ref.current?.value.trim() ?? "";
    if (!body || !canInteract) return;
    if (ref.current) ref.current.value = "";
    setPendingComment(true);
    startTransition(async () => {
      const result = await addComment(card.id, body);
      if (result && "comment" in result && result.comment) {
        const newComment = result.comment as Comment;
        const next = [...comments, newComment];
        setComments(next);
        onSaved(card.id, { comments: next });
      }
      setPendingComment(false);
    });
  }

  return (
    <div
      className="mt-1"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={handleLike}
          disabled={!canInteract}
          aria-label={liked ? "Ta bort gillning" : "Gilla"}
          title={
            !isLoggedIn
              ? "Logga in för att gilla"
              : !isMember
              ? "Bli medlem i projektet för att gilla"
              : liked
              ? "Ta bort gillning"
              : "Gilla"
          }
          className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${
            liked ? "text-coral" : "text-gray-400 hover:text-coral"
          } ${!canInteract ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          <svg className="w-3 h-3" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-8.53a2 2 0 01-2-2v-7a2 2 0 012-2h2.5m4-6l-1 5h6a1 1 0 011 1v1m-7-7v7m0-7L9 4" />
          </svg>
          Gilla{likeCount > 0 ? ` (${likeCount})` : ""}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-seagrass transition-colors cursor-pointer"
        >
          💬 Kommentera{comments.length > 0 ? ` (${comments.length})` : ""}
        </button>
      </div>

      {showComments && (
        <div className="mt-1.5 space-y-1.5">
          {comments.map((c) => (
            <div key={c.id} className="bg-gray-50 rounded-md px-2 py-1">
              <p className="text-[10px]">
                <span className="font-semibold text-gray-700">{c.author.name ?? "Okänd"}</span>{" "}
                <span className="text-gray-400">· {timeAgo(c.createdAt)}</span>
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">{htmlToPreviewText(c.body)}</p>
            </div>
          ))}
          {canInteract ? (
            <form onSubmit={handleSubmit} className="flex gap-1.5">
              <textarea
                ref={ref}
                rows={1}
                placeholder="Skriv en kommentar..."
                className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-coral resize-none"
              />
              <button
                type="submit"
                disabled={pendingComment}
                className="px-2 py-1 bg-coral text-white text-[10px] font-medium rounded-md hover:bg-watermelon transition-colors disabled:opacity-50"
              >
                Skicka
              </button>
            </form>
          ) : !isLoggedIn ? (
            <p className="text-[10px] text-gray-400">Logga in för att kommentera.</p>
          ) : (
            <p className="text-[10px] text-gray-400">Bli medlem i projektet för att kommentera.</p>
          )}
        </div>
      )}
    </div>
  );
}

export const KanbanCardComments = React.memo(KanbanCardCommentsImpl);

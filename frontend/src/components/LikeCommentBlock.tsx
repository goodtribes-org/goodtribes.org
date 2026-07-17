"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { toggleFeedLike, addFeedComment } from "@/app/actions";
import FlagContentButton, { type FlagContentTargetType } from "@/components/FlagContentButton";

export type LikeCommentEntry = { id: string; author: string; body: string; timeAgo: string };

// Generic like + comment thread, decoupled from the activity feed's
// membership-gating/join-CTA concerns (see FeedItemActions, which wraps this
// for feed items) — used directly by content types with no such gating
// (Organisation, AcademyGuide, WikiPage, ...).
export default function LikeCommentBlock({
  targetType,
  targetId,
  commentTargetType,
  flagTargetType = null,
  commentFlagTargetType = null,
  hideLike = false,
  isLoggedIn,
  canInteract = isLoggedIn,
  disabledHint,
  initialLikeCount,
  initialLiked,
  initialComments,
}: {
  targetType: string;
  targetId: string;
  /** Defaults to targetType — override when comments live on a different model (e.g. feed items routing to KanbanCardComment/Message). */
  commentTargetType?: string;
  flagTargetType?: FlagContentTargetType | null;
  commentFlagTargetType?: FlagContentTargetType | null;
  /** Some content (e.g. wiki pages) supports comments but not a like — see the plan's content-type table. */
  hideLike?: boolean;
  isLoggedIn: boolean;
  canInteract?: boolean;
  disabledHint?: ReactNode;
  initialLikeCount: number;
  initialLiked: boolean;
  initialComments: LikeCommentEntry[];
}) {
  const [, startTransition] = useTransition();
  const [pendingComment, setPendingComment] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(initialLiked);
  const [comments, setComments] = useState(initialComments);
  const [showComments, setShowComments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  const effectiveCommentTargetType = commentTargetType ?? targetType;

  function handleLike() {
    if (!canInteract) return;
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    setLiked((v) => !v);
    startTransition(async () => {
      const result = await toggleFeedLike(targetType, targetId);
      if (result && "error" in result && result.error) {
        setLikeCount((c) => (liked ? c + 1 : c - 1));
        setLiked((v) => !v);
        setError(result.error);
        setTimeout(() => setError(null), 4000);
      }
    });
  }

  function handleComment(e: React.FormEvent) {
    e.preventDefault();
    const body = ref.current?.value ?? "";
    if (!body.trim() || !canInteract) return;
    setComments((c) => [...c, { id: `tmp-${c.length}`, author: "Du", body, timeAgo: "just nu" }]);
    if (ref.current) ref.current.value = "";
    setPendingComment(true);
    startTransition(async () => {
      const result = await addFeedComment(effectiveCommentTargetType, targetId, body);
      setPendingComment(false);
      if (result && "error" in result && result.error) {
        setError(result.error);
        setTimeout(() => setError(null), 4000);
      }
    });
  }

  return (
    <div className="mt-2 pt-2 border-t border-muted-teal/20">
      <div className="flex items-center gap-4">
        {!hideLike && (
          <button
            onClick={handleLike}
            disabled={!canInteract}
            title={!isLoggedIn ? "Logga in för att gilla" : liked ? "Ta bort gillning" : "Gilla"}
            className={`flex items-center gap-1 text-xs font-medium transition-colors ${
              liked ? "text-coral" : "text-dark-slate/50 hover:text-coral"
            } ${!canInteract ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          >
            <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Gilla{likeCount > 0 ? ` (${likeCount})` : ""}
          </button>
        )}
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-dark-slate/50 hover:text-seagrass transition-colors cursor-pointer"
        >
          💬 Kommentera{comments.length > 0 ? ` (${comments.length})` : ""}
        </button>
        {isLoggedIn && flagTargetType && (
          <FlagContentButton targetType={flagTargetType} targetId={targetId} />
        )}
      </div>

      {error && <p className="text-xs text-coral mt-1">{error}</p>}

      {showComments && (
        <div className="mt-2 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="bg-dry-sage/10 rounded-lg px-2.5 py-1.5">
              <p className="text-[11px]">
                <span className="font-semibold text-dark-slate">{c.author}</span>{" "}
                <span className="text-dark-slate/40">· {c.timeAgo}</span>
              </p>
              <p className="text-xs text-dark-slate/80 mt-0.5">{c.body}</p>
              {isLoggedIn && commentFlagTargetType && !c.id.startsWith("tmp-") && (
                <FlagContentButton targetType={commentFlagTargetType} targetId={c.id} />
              )}
            </div>
          ))}
          {canInteract ? (
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
            disabledHint ?? (
              <p className="text-[11px] text-dark-slate/40">Logga in för att kommentera.</p>
            )
          )}
        </div>
      )}
    </div>
  );
}

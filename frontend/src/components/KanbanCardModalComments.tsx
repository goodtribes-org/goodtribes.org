"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { addComment, deleteComment, toggleCardLike } from "@/app/[locale]/projects/[slug]/(workspace)/kanban/actions";
import { htmlToPreviewText } from "@/lib/renderBody";
import FlagContentButton from "@/components/FlagContentButton";
import { timeAgo, type Card, type Comment } from "./kanbanShared";

// The full-detail comments/like section for CardDetailModal (KanbanCardModal.tsx).
// Not to be confused with KanbanCardComments.tsx, a separate, more compact
// comments widget shown inline on the board's card-front (KanbanCardItem.tsx) --
// the two were never shared and have always had independent implementations
// and i18n namespaces (this one uses "KanbanCardModal", that one uses its own
// "KanbanCardComments" namespace).
export default function KanbanCardModalComments({
  cardId,
  initialComments,
  initialLiked,
  initialLikeCount,
  isLoggedIn,
  currentUserId,
  canInteractWithCard,
  onSaved,
}: {
  cardId: string;
  initialComments: Comment[];
  initialLiked: boolean;
  initialLikeCount: number;
  isLoggedIn: boolean;
  currentUserId: string | null;
  canInteractWithCard: boolean;
  onSaved: (cardId: string, patch: Partial<Card>) => void;
}) {
  const t = useTranslations("Kanban");
  const tCard = useTranslations("KanbanCardModal");
  const tShared = useTranslations("KanbanShared");
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [cardLiked, setCardLiked] = useState(initialLiked);
  const [cardLikeCount, setCardLikeCount] = useState(initialLikeCount);
  const [, startTransition] = useTransition();

  function handleToggleCardLike() {
    if (!isLoggedIn || !canInteractWithCard) return;
    const nextLiked = !cardLiked;
    const nextCount = cardLikeCount + (cardLiked ? -1 : 1);
    setCardLikeCount(nextCount);
    setCardLiked(nextLiked);
    onSaved(cardId, { likedByMe: nextLiked, likeCount: nextCount });
    startTransition(async () => { await toggleCardLike(cardId); });
  }

  async function handleSubmitComment() {
    if (!commentBody.trim()) return;
    setSubmittingComment(true);
    setCommentError(null);
    const result = await addComment(cardId, commentBody);
    if (result && "comment" in result && result.comment) {
      const newComment = result.comment as Comment;
      const next = [...comments, newComment];
      setComments(next);
      onSaved(cardId, { comments: next });
      setCommentBody("");
    } else if (result && "error" in result) {
      setCommentError(
        result.error === "Not a project member"
          ? tCard("commentMemberRequiredError")
          : result.error
      );
    }
    setSubmittingComment(false);
  }

  async function handleDeleteComment(commentId: string) {
    const next = comments.filter((c) => c.id !== commentId);
    setComments(next);
    onSaved(cardId, { comments: next });
    await deleteComment(commentId);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={handleToggleCardLike}
          disabled={!isLoggedIn || !canInteractWithCard}
          title={
            !isLoggedIn
              ? tCard("likeTitleLoginRequired")
              : !canInteractWithCard
              ? tCard("likeTitleMembershipRequired")
              : cardLiked
              ? tCard("likeTitleRemove")
              : tCard("likeTitleAdd")
          }
          className={`flex items-center gap-1 text-xs font-medium transition-colors ${
            cardLiked ? "text-coral" : "text-gray-400 hover:text-coral"
          } ${!isLoggedIn || !canInteractWithCard ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          <svg className="w-4 h-4" fill={cardLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {cardLikeCount > 0 ? tCard("likeButtonWithCount", { count: cardLikeCount }) : tCard("likeButton")}
        </button>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {comments.length > 0 ? tCard("commentsLabelWithCount", { count: comments.length }) : tCard("commentsLabel")}
        </p>
      </div>

      {comments.length > 0 && (
        <div className="space-y-2 mb-3">
          {comments.map((c) => (
            <div key={c.id} className="group bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs">
                <span className="font-semibold text-gray-700">{c.author.name ?? tCard("commentAuthorUnknown")}</span>{" "}
                <span className="text-gray-400">· {timeAgo(c.createdAt, tShared)}</span>
                {c.authorId === currentUserId && (
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    className="ml-2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {tCard("commentDelete")}
                  </button>
                )}
              </p>
              <p className="text-xs text-gray-700 mt-1">{htmlToPreviewText(c.body)}</p>
              {isLoggedIn && <FlagContentButton targetType="KanbanCardComment" targetId={c.id} />}
            </div>
          ))}
        </div>
      )}

      {isLoggedIn && canInteractWithCard ? (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmitComment(); }} className="flex gap-2">
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            rows={1}
            placeholder={tCard("commentPlaceholder")}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
          />
          <button
            type="submit"
            disabled={submittingComment || !commentBody.trim()}
            className="px-4 py-2 bg-coral text-white text-sm font-medium rounded-lg hover:bg-watermelon transition-colors disabled:opacity-50"
          >
            {submittingComment ? tCard("commentSubmitPending") : tCard("commentSubmitButton")}
          </button>
        </form>
      ) : !isLoggedIn ? (
        <p className="text-xs text-gray-400">{tCard("commentLoginPrompt")}</p>
      ) : (
        <p className="text-xs text-gray-400">{t("commentJoinOrClaim")}</p>
      )}
      {commentError && <p className="text-xs text-red-500 mt-1">{commentError}</p>}
    </div>
  );
}

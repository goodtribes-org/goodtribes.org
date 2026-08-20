"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { toggleFeedLike } from "@/app/actions";
import { leaveProject, toggleFollowProject } from "./member-actions";
import { JoinButton } from "./JoinSection";
import ShareButton from "@/components/ShareButton";

// Top-of-sidebar widget consolidating the ways a visitor interacts with a
// project as a whole (as opposed to any specific piece of its content):
// share it outside GoodTribes, like it, follow it, and join or leave its
// membership. Follow and Join are independent — following is a lightweight
// step below joining, not a replacement for it, so both show together
// until the visitor is an actual member.
export default function ProjectQuickActions({
  projectId,
  slug,
  userId,
  isRealMember,
  canLeave,
  initialIsFollowing,
  existingJoinStatus,
  initialLikeCount,
  initialLiked,
  shareUrl,
  shareTitle,
  shareText,
}: {
  projectId: string;
  slug: string;
  userId: string | null;
  isRealMember: boolean;
  canLeave: boolean;
  initialIsFollowing: boolean;
  existingJoinStatus: string | null;
  initialLikeCount: number;
  initialLiked: boolean;
  shareUrl: string;
  shareTitle: string;
  shareText?: string;
}) {
  const t = useTranslations("ProjectDetailPage");
  const tLike = useTranslations("LikeCommentBlock");
  const [isPending, startTransition] = useTransition();
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(initialLiked);
  const [left, setLeft] = useState(false);
  const [following, setFollowing] = useState(initialIsFollowing);

  function handleLike() {
    if (!userId) return;
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    setLiked((v) => !v);
    startTransition(async () => {
      const result = await toggleFeedLike("project", projectId);
      if (result && "error" in result && result.error) {
        setLikeCount((c) => (liked ? c + 1 : c - 1));
        setLiked((v) => !v);
      }
    });
  }

  function handleFollow() {
    if (!userId) return;
    setFollowing((v) => !v);
    startTransition(async () => {
      const result = await toggleFollowProject(projectId, slug);
      if ("error" in result) {
        setFollowing((v) => !v);
      }
    });
  }

  function handleLeave() {
    if (!confirm(t("leaveProjectConfirm"))) return;
    startTransition(async () => {
      await leaveProject(projectId, slug);
      setLeft(true);
    });
  }

  const effectiveIsRealMember = isRealMember && !left;

  return (
    <section className="bg-white border border-muted-teal/30 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <button
          onClick={handleLike}
          disabled={!userId}
          title={
            !userId
              ? tLike("likeTooltipLoginRequired")
              : liked
                ? tLike("likeTooltipRemove")
                : tLike("likeTooltipAdd")
          }
          className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2 border transition-colors ${
            liked
              ? "text-coral border-coral/40 bg-coral/5"
              : "text-dark-slate/60 border-muted-teal/40 hover:text-coral hover:border-coral/40"
          } ${!userId ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {likeCount > 0 ? tLike("likeButtonWithCount", { count: likeCount }) : tLike("likeButton")}
        </button>

        <ShareButton url={shareUrl} title={shareTitle} text={shareText} variant="button" />
      </div>

      <div className="mt-2.5 flex flex-col gap-2">
        {!effectiveIsRealMember && (
          <button
            onClick={handleFollow}
            disabled={!userId || isPending}
            className={`flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2 border transition-colors ${
              following
                ? "text-seagrass border-seagrass/40 bg-seagrass/5"
                : "text-dark-slate/60 border-muted-teal/40 hover:text-seagrass hover:border-seagrass/40"
            } ${!userId ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          >
            {following ? `✓ ${t("followingButton")}` : t("followButton")}
          </button>
        )}

        {effectiveIsRealMember ? (
          canLeave && (
            <button
              onClick={handleLeave}
              disabled={isPending}
              className="w-full text-center text-xs font-medium text-dark-slate/50 hover:text-coral border border-muted-teal/40 rounded-lg py-2 transition-colors disabled:opacity-50"
            >
              {t("leaveProjectButton")}
            </button>
          )
        ) : userId ? (
          <JoinButton
            projectId={projectId}
            slug={slug}
            existingStatus={left ? null : existingJoinStatus}
            label={t("joinCta")}
            className="flex justify-center w-full py-2 bg-coral text-white rounded-lg font-semibold text-sm hover:bg-coral/90 transition-colors"
          />
        ) : (
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(`/projects/${slug}`)}`}
            className="flex justify-center w-full py-2 bg-coral text-white rounded-lg font-semibold text-sm hover:bg-coral/90 transition-colors"
          >
            {t("joinCta")}
          </Link>
        )}
      </div>
    </section>
  );
}

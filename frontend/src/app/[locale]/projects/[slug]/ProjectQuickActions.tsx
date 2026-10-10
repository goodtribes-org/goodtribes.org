"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  firstTasks,
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
  // Step 2 for visitors (#277): the project's open first tasks.
  firstTasks?: React.ReactNode;
}) {
  const t = useTranslations("ProjectDetailPage");
  const tLike = useTranslations("LikeCommentBlock");
  const tFirst = useTranslations("FirstTasks");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(initialLiked);
  const [left, setLeft] = useState(false);
  const [following, setFollowing] = useState(initialIsFollowing);
  // Taking a first task follows the project on the server (#277); pick that up
  // when the page refreshes.
  useEffect(() => setFollowing(initialIsFollowing), [initialIsFollowing]);

  // Logged out: the click goes to the login page and comes back with ?do=…,
  // and the action runs then — no greyed-out buttons that look broken.
  function loginThen(action: "like" | "follow") {
    window.location.assign(`/login?callbackUrl=${encodeURIComponent(`/projects/${slug}?do=${action}`)}`);
  }

  function handleLike() {
    if (!userId) return loginThen("like");
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
    if (!userId) return loginThen("follow");
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

  // Back from the login page: finish the like/follow the visitor clicked.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || !userId) return;
    resumed.current = true;
    const url = new URL(window.location.href);
    const action = url.searchParams.get("do");
    if (!action) return;
    url.searchParams.delete("do");
    // Through the router, so a later refresh (the server action) doesn't bring ?do= back.
    router.replace(url.pathname + url.search, { scroll: false });
    if (action === "like" && !liked) handleLike();
    if (action === "follow" && !following && !isRealMember) handleFollow();
    // Runs once, on the first render after login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <section className="bg-white border border-muted-teal/30 rounded-xl p-4">
      {/* Gilla and Dela are quick reactions, so they're the same size. */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleLike}
          title={
            !userId
              ? tLike("likeTooltipLoginRequired")
              : liked
                ? tLike("likeTooltipRemove")
                : tLike("likeTooltipAdd")
          }
          className={`flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2 border transition-colors cursor-pointer ${
            liked
              ? "text-coral border-coral/40 bg-coral/5"
              : "text-dark-slate/60 border-muted-teal/40 hover:text-coral hover:border-coral/40"
          }`}
        >
          <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {likeCount > 0 ? tLike("likeButtonWithCount", { count: likeCount }) : tLike("likeButton")}
        </button>

        <ShareButton url={shareUrl} title={shareTitle} text={shareText} variant="block" />
      </div>

      {/* The way in: follow (a light first step) before joining. */}
      <div className={`flex flex-col gap-2 ${effectiveIsRealMember ? "mt-2.5" : "mt-3 border-t border-muted-teal/20 pt-3"}`}>
        {!effectiveIsRealMember && (
          <div>
            <button
              onClick={handleFollow}
              disabled={isPending}
              className={`w-full flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg py-2 border-2 border-seagrass text-seagrass transition-colors cursor-pointer ${
                following ? "bg-seagrass/10" : "hover:bg-seagrass/5"
              }`}
            >
              {following ? `✓ ${t("followingButton")}` : `+ ${t("followButton")}`}
            </button>
            <p className="mt-1 text-center text-[11px] text-dark-slate/50">{t("followHint")}</p>
          </div>
        )}

        {!effectiveIsRealMember && firstTasks && <div className="border-t border-muted-teal/20 pt-3">{firstTasks}</div>}

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
        {!effectiveIsRealMember && firstTasks && <p className="-mt-1 text-center text-[10px] text-dark-slate/45">{tFirst("joinNote")}</p>}
      </div>
    </section>
  );
}

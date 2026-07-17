"use client";

import { JoinButton } from "@/app/[locale]/projects/[slug]/JoinSection";
import LikeCommentBlock, { type LikeCommentEntry } from "@/components/LikeCommentBlock";
import type { FlagContentTargetType } from "@/components/FlagContentButton";

type JoinCta = { projectId: string; slug: string; existingStatus: string | null };

// The feed mixes several underlying models behind one loose targetType
// vocabulary — only map the ones that actually have a hiddenAt/ContentFlag
// target type; everything else (blogPost, milestone, project, idea,
// activityEvent) isn't flaggable here.
function itemModelTargetType(itemTargetType: string): FlagContentTargetType | null {
  switch (itemTargetType) {
    case "feedPost": return "FeedPost";
    case "channelMessage": return "Message";
    case "kanbanCardComment": return "KanbanCardComment";
    case "ideaComment": return "IdeaComment";
    default: return null;
  }
}

// Nested replies shown in the feed's comment thread are sourced from
// FeedComment, except for kanbanCardComment/channelMessage items where they're
// the same KanbanCardComment/Message rows shown on the card/channel itself
// (see activityFeed.ts's getFeedInteractionData comment).
function commentModelTargetType(itemTargetType: string): FlagContentTargetType {
  if (itemTargetType === "kanbanCardComment") return "KanbanCardComment";
  if (itemTargetType === "channelMessage") return "Message";
  return "FeedComment";
}

export default function FeedItemActions({
  targetType,
  targetId,
  isLoggedIn,
  requiresMembership,
  isProjectMember,
  joinCta,
  initialLikeCount,
  initialLiked,
  initialComments,
}: {
  targetType: string;
  targetId: string;
  isLoggedIn: boolean;
  requiresMembership?: boolean;
  isProjectMember?: boolean;
  joinCta?: JoinCta | null;
  initialLikeCount: number;
  initialLiked: boolean;
  initialComments: LikeCommentEntry[];
}) {
  const canInteract = isLoggedIn && (!requiresMembership || !!isProjectMember);

  const disabledHint = !isLoggedIn ? undefined : joinCta ? (
    <JoinButton
      projectId={joinCta.projectId}
      slug={joinCta.slug}
      existingStatus={joinCta.existingStatus}
      label="Bli medlem för att kommentera"
      className="text-xs font-medium bg-seagrass text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
    />
  ) : (
    <p className="text-[11px] text-dark-slate/40">Bli medlem i projektet för att kommentera.</p>
  );

  return (
    <LikeCommentBlock
      targetType={targetType}
      targetId={targetId}
      commentTargetType={commentModelTargetType(targetType)}
      flagTargetType={itemModelTargetType(targetType)}
      commentFlagTargetType={commentModelTargetType(targetType)}
      isLoggedIn={isLoggedIn}
      canInteract={canInteract}
      disabledHint={disabledHint}
      initialLikeCount={initialLikeCount}
      initialLiked={initialLiked}
      initialComments={initialComments}
    />
  );
}

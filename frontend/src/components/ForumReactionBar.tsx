"use client";

import { useTransition } from "react";
import { ReactionBar } from "./ReactionBar";
import { togglePostReaction, toggleReplyReaction } from "@/app/[locale]/projects/[slug]/(workspace)/forum/actions";

type Reaction = { emoji: string; userId: string };

export function ForumPostReactionBar({
  postId,
  slug,
  reactions,
  currentUserId,
}: {
  postId: string;
  slug: string;
  reactions: Reaction[];
  currentUserId: string | null;
}) {
  const [, startTransition] = useTransition();
  return (
    <ReactionBar
      reactions={reactions}
      currentUserId={currentUserId}
      canAdd={!!currentUserId}
      onToggle={(emoji) => {
        startTransition(() => togglePostReaction(postId, slug, emoji));
      }}
    />
  );
}

export function ForumReplyReactionBar({
  replyId,
  postId,
  slug,
  reactions,
  currentUserId,
}: {
  replyId: string;
  postId: string;
  slug: string;
  reactions: Reaction[];
  currentUserId: string | null;
}) {
  const [, startTransition] = useTransition();
  return (
    <ReactionBar
      reactions={reactions}
      currentUserId={currentUserId}
      canAdd={!!currentUserId}
      onToggle={(emoji) => {
        startTransition(() => toggleReplyReaction(replyId, postId, slug, emoji));
      }}
    />
  );
}

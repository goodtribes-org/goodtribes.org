"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import Image from "next/image";
import { ReactionBar } from "@/components/ReactionBar";
import { renderBody } from "@/lib/renderBody";
import { toggleReaction } from "../actions";
import { FEED_LIKE_EMOJI } from "@/lib/feedLikeEmoji";
import { MessageInput } from "./MessageInput";
import type { MessageRow } from "./KanalerShell";

function timeLabel(iso: string) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just nu";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

type Props = {
  slug: string;
  channelId: string;
  threadParentId: string;
  parentMessage: MessageRow | null;
  isMember: boolean;
  currentUserId: string | null;
  onClose: () => void;
};

export function ThreadPanel({
  slug,
  channelId,
  threadParentId,
  parentMessage,
  isMember,
  currentUserId,
  onClose,
}: Props) {
  const [replies, setReplies] = useState<MessageRow[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(
        `/api/projects/${slug}/kanaler/${channelId}/thread/${threadParentId}`
      );
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setReplies(data);
    }
    load();
    return () => { cancelled = true; };
  }, [channelId, slug, threadParentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies.length]);

  function handleSent() {
    // Reload thread replies after send
    fetch(`/api/projects/${slug}/kanaler/${channelId}/thread/${threadParentId}`)
      .then((r) => r.json())
      .then(setReplies)
      .catch(() => {});
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-3 border-b border-muted-teal/20 shrink-0">
        <span className="text-sm font-semibold text-dark-slate">Tråd</span>
        <button
          onClick={onClose}
          className="text-dark-slate/40 hover:text-dark-slate text-lg leading-none"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
        {/* Parent message */}
        {parentMessage && (
          <MessageItem
            m={parentMessage}
            channelId={channelId}
            slug={slug}
            currentUserId={currentUserId}
            isMember={isMember}
            startTransition={startTransition}
            isParent
          />
        )}

        {replies.length > 0 && (
          <>
            <div className="text-[10px] text-dark-slate/40 uppercase tracking-widest border-t border-muted-teal/10 pt-2">
              {replies.length} {replies.length === 1 ? "svar" : "svar"}
            </div>
            {replies.map((r) => (
              <MessageItem
                key={r.id}
                m={r}
                channelId={channelId}
                slug={slug}
                currentUserId={currentUserId}
                isMember={isMember}
                startTransition={startTransition}
              />
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {isMember && (
        <div className="border-t border-muted-teal/20 px-3 py-3 shrink-0">
          <MessageInput
            channelId={channelId}
            projectSlug={slug}
            threadParentId={threadParentId}
            onSent={handleSent}
          />
        </div>
      )}
    </div>
  );
}

function MessageItem({
  m,
  channelId,
  slug,
  currentUserId,
  isMember,
  startTransition,
  isParent,
}: {
  m: MessageRow;
  channelId: string;
  slug: string;
  currentUserId: string | null;
  isMember: boolean;
  startTransition: (fn: () => void) => void;
  isParent?: boolean;
}) {
  const initials = (m.author.name ?? "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className={`flex items-start gap-2 ${isParent ? "pb-2 border-b border-muted-teal/10" : ""}`}>
      <div className="w-7 h-7 rounded-full bg-dry-sage flex items-center justify-center text-[10px] font-semibold text-dark-slate shrink-0 overflow-hidden relative">
        {m.author.image ? (
          <Image src={m.author.image} fill className="object-cover" alt="" unoptimized />
        ) : (
          initials
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className="text-[11px] font-semibold text-dark-slate">
            {m.author.name ?? "Okänd"}
          </span>
          <span className="text-[10px] text-dark-slate/40">{timeLabel(m.createdAt)}</span>
        </div>
        <div className="text-sm">{renderBody(m.body)}</div>
        {(() => {
          const likeCount = m.reactions.filter((r) => r.emoji === FEED_LIKE_EMOJI).length;
          const likedByMe = !!currentUserId && m.reactions.some(
            (r) => r.emoji === FEED_LIKE_EMOJI && r.userId === currentUserId
          );
          return (
            <button
              onClick={() => startTransition(() => toggleReaction(m.id, channelId, slug, FEED_LIKE_EMOJI))}
              disabled={!isMember}
              title={isMember ? (likedByMe ? "Ta bort gillning" : "Gilla") : "Bli medlem för att gilla"}
              className={`mt-1 flex items-center gap-1 text-xs font-medium transition-colors ${
                likedByMe ? "text-coral" : "text-gray-400 hover:text-coral"
              } ${!isMember ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
            >
              👍 Gilla{likeCount > 0 ? ` (${likeCount})` : ""}
            </button>
          );
        })()}
        <ReactionBar
          reactions={m.reactions.filter((r) => r.emoji !== FEED_LIKE_EMOJI)}
          currentUserId={currentUserId}
          canAdd={isMember}
          onToggle={(emoji) =>
            startTransition(() => toggleReaction(m.id, channelId, slug, emoji))
          }
        />
      </div>
    </div>
  );
}

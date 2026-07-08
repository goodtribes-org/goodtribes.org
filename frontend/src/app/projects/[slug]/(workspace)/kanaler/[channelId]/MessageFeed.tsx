"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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

function timeShort(iso: string) {
  return new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

function getInitials(name: string | null) {
  return (name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function buildGrouped(messages: MessageRow[]) {
  return messages.map((m, i) => {
    const prev = messages[i - 1];
    const isGrouped =
      !!prev &&
      prev.author.id === m.author.id &&
      new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
    return { ...m, isGrouped };
  });
}

type Props = {
  slug: string;
  channelId: string;
  channelName: string;
  channelType: string;
  messages: MessageRow[];
  isMember: boolean;
  isAdmin: boolean;
  currentUserId: string | null;
  openThreadId: string | null;
  onOpenThread: (id: string) => void;
  onSidebarToggle: () => void;
};

export function MessageFeed({
  slug,
  channelId,
  channelName,
  channelType,
  messages,
  isMember,
  isAdmin,
  currentUserId,
  openThreadId,
  onOpenThread,
  onSidebarToggle,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const [deepLinkHash] = useState(() =>
    typeof window !== "undefined" ? window.location.hash.slice(1) : ""
  );
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [inlineReplies, setInlineReplies] = useState<Record<string, MessageRow[]>>({});

  function loadInlineReplies(messageId: string) {
    fetch(`/api/projects/${slug}/kanaler/${channelId}/thread/${messageId}`)
      .then((r) => r.json())
      .then((data) => setInlineReplies((prev) => ({ ...prev, [messageId]: data })))
      .catch(() => {});
  }

  function toggleInlineThread(messageId: string) {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
        if (!inlineReplies[messageId]) loadInlineReplies(messageId);
        setTimeout(() => {
          document.getElementById(`message-${messageId}`)?.scrollIntoView({ block: "end", behavior: "smooth" });
        }, 50);
      }
      return next;
    });
  }

  useEffect(() => {
    if (deepLinkHash) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, deepLinkHash]);

  useEffect(() => {
    if (!deepLinkHash) return;
    const el = document.getElementById(deepLinkHash);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("bg-coral/10");
    const timeout = setTimeout(() => el.classList.remove("bg-coral/10"), 2500);
    return () => clearTimeout(timeout);
  }, [deepLinkHash]);

  const canPost = isMember && (channelType !== "announcement" || isAdmin);
  const grouped = buildGrouped(messages);

  function handleReaction(messageId: string, emoji: string) {
    startTransition(() => toggleReaction(messageId, channelId, slug, emoji));
  }

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full bg-white">
      {/* Channel header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-200 shrink-0 bg-white">
        <button
          className="md:hidden mr-1 text-gray-400 hover:text-gray-700"
          onClick={onSidebarToggle}
        >
          ☰
        </button>
        <span className="text-gray-400 font-normal text-base mr-0.5">#</span>
        <span className="font-bold text-base text-gray-900">{channelName}</span>
        {channelType === "announcement" && (
          <span className="text-xs bg-coral/10 text-coral px-2 py-0.5 rounded-full ml-1">
            Tillkännagivanden
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto py-2 flex flex-col">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-8">
            Inga meddelanden ännu.{" "}
            {canPost ? "Starta diskussionen!" : "Gå med i projektet för att skriva."}
          </p>
        ) : (
          grouped.map((m) => {
            const initials = (m.author.name ?? "?")
              .split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
            const isActiveThread = m.id === openThreadId || expandedThreads.has(m.id);

            return (
              <div
                key={m.id}
                id={`message-${m.id}`}
                className={`relative group flex items-start gap-0 px-4 py-0.5 hover:bg-gray-50 transition-colors ${
                  isActiveThread ? "bg-blue-50" : ""
                } ${m.isGrouped ? "" : "mt-2"} ${expandedThreads.has(m.id) ? "pb-2" : ""}`}
              >
                {/* Hover action bar */}
                <div className="absolute right-4 -top-3 hidden group-hover:flex items-center bg-white border border-gray-200 rounded-lg shadow-md z-10 overflow-hidden">
                  {["👍", "❤️", "😄", "🎉", "😮"].map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => handleReaction(m.id, e)}
                      className="px-2 py-1.5 hover:bg-gray-100 text-base transition-colors"
                    >
                      {e}
                    </button>
                  ))}
                  <div className="w-px h-5 bg-gray-200 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => onOpenThread(m.id)}
                    className="px-2 py-1.5 hover:bg-gray-100 text-gray-500 transition-colors"
                    title="Svara i tråd"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 12.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                </div>

                {m.isGrouped ? (
                  /* Grouped: show time on hover instead of avatar */
                  <div className="w-9 shrink-0 self-start mt-1 text-right pr-1">
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-400 leading-none">
                      {timeShort(m.createdAt)}
                    </span>
                  </div>
                ) : (
                  /* First in group: show avatar */
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0 mt-0.5 overflow-hidden relative">
                    {m.author.image ? (
                      <Image src={m.author.image} fill className="object-cover" alt="" unoptimized />
                    ) : (
                      initials
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0 ml-3">
                  {!m.isGrouped && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-sm font-bold text-gray-900">
                        {m.author.name ?? "Okänd"}
                      </span>
                      <span className="text-xs text-gray-400">{timeLabel(m.createdAt)}</span>
                    </div>
                  )}
                  {renderBody(m.body)}

                  {(() => {
                    const likeCount = m.reactions.filter((r) => r.emoji === FEED_LIKE_EMOJI).length;
                    const likedByMe = !!currentUserId && m.reactions.some(
                      (r) => r.emoji === FEED_LIKE_EMOJI && r.userId === currentUserId
                    );
                    return (
                      <div className="mt-1 flex items-center gap-4">
                        <button
                          onClick={() => handleReaction(m.id, FEED_LIKE_EMOJI)}
                          disabled={!isMember}
                          title={isMember ? (likedByMe ? "Ta bort gillning" : "Gilla") : "Bli medlem för att gilla"}
                          className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                            likedByMe ? "text-coral" : "text-gray-400 hover:text-coral"
                          } ${!isMember ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                        >
                          👍 Gilla{likeCount > 0 ? ` (${likeCount})` : ""}
                        </button>
                        <button
                          onClick={() => toggleInlineThread(m.id)}
                          className="text-xs text-seagrass hover:underline font-medium flex items-center gap-1"
                        >
                          💬 {m._count.threadReplies > 0 ? `Kommentera (${m._count.threadReplies})` : "Kommentera"}
                        </button>
                      </div>
                    );
                  })()}

                  <ReactionBar
                    reactions={m.reactions.filter((r) => r.emoji !== FEED_LIKE_EMOJI)}
                    currentUserId={currentUserId}
                    canAdd={isMember}
                    onToggle={(emoji) => handleReaction(m.id, emoji)}
                  />

                  {expandedThreads.has(m.id) && (
                    <div className="mt-2 pl-3 border-l-2 border-muted-teal/20 space-y-2">
                      {(inlineReplies[m.id] ?? []).map((r) => (
                        <div key={r.id} className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-600 shrink-0 overflow-hidden relative">
                            {r.author.image ? (
                              <Image src={r.author.image} fill className="object-cover" alt="" unoptimized />
                            ) : (
                              getInitials(r.author.name)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xs font-semibold text-gray-900">
                                {r.author.name ?? "Okänd"}
                              </span>
                              <span className="text-[10px] text-gray-400">{timeLabel(r.createdAt)}</span>
                            </div>
                            <div className="text-sm">{renderBody(r.body)}</div>
                          </div>
                        </div>
                      ))}
                      {isMember ? (
                        <MessageInput
                          channelId={channelId}
                          projectSlug={slug}
                          threadParentId={m.id}
                          onSent={() => loadInlineReplies(m.id)}
                        />
                      ) : (
                        <p className="text-xs text-gray-400">Gå med i projektet för att kommentera.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canPost ? (
        <div className="border-t border-gray-200 px-4 py-3 bg-white shrink-0">
          <MessageInput channelId={channelId} projectSlug={slug} />
        </div>
      ) : !isMember ? (
        <div className="border-t border-gray-200 px-4 py-3 bg-white shrink-0">
          <p className="text-sm text-gray-400 text-center">
            Gå med i projektet för att skriva.
          </p>
        </div>
      ) : null}
    </div>
  );
}

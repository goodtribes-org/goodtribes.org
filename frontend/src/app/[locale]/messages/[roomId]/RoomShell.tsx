"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ReactionBar } from "@/components/ReactionBar";
import { renderBody } from "@/lib/renderBody";
import { toggleReaction, markRoomRead } from "../actions";
import { FEED_LIKE_EMOJI } from "@/lib/feedLikeEmoji";
import { MessageComposer } from "./MessageComposer";
import PresenceDot from "@/components/PresenceDot";

export type MessageRow = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  threadParentId: string | null;
  authorId: string;
  author: { id: string; name: string | null; image: string | null };
  reactions: { emoji: string; userId: string }[];
  _count: { threadReplies: number };
};

type RoomInfo = {
  id: string;
  type: "DM" | "GROUP" | "PROJECT_CHANNEL" | "ORG_CHANNEL";
  name: string | null;
  postingPolicy: "ALL_MEMBERS" | "LEADS_ONLY";
  otherUsers: { id: string; name: string | null; image: string | null }[];
};

type Props = {
  room: RoomInfo;
  initialMessages: MessageRow[];
  currentUserId: string;
  canPost: boolean;
};

function timeLabel(iso: string) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just nu";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

function initialsOf(name: string | null) {
  return (name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function roomTitle(room: RoomInfo) {
  if (room.type === "DM") return room.otherUsers[0]?.name ?? "?";
  if (room.type === "GROUP") return room.name ?? room.otherUsers.map((u) => u.name).join(", ");
  return room.name ? `#${room.name}` : room.type === "ORG_CHANNEL" ? "Arbetsrum" : "Kanal";
}

function buildGrouped(messages: MessageRow[]) {
  return messages.map((m, i) => {
    const prev = messages[i - 1];
    const isGrouped =
      !!prev &&
      prev.authorId === m.authorId &&
      new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
    return { ...m, isGrouped };
  });
}

export function RoomShell({ room, initialMessages, currentUserId, canPost }: Props) {
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [, startTransition] = useTransition();
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [inlineReplies, setInlineReplies] = useState<Record<string, MessageRow[]>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    markRoomRead(room.id).catch(() => {});
  }, [room.id]);

  useEffect(() => {
    if (esRef.current) esRef.current.close();
    const es = new EventSource(`/api/rooms/${room.id}/sse`);
    esRef.current = es;

    es.addEventListener("message", (e) => {
      const msg: MessageRow = JSON.parse(e.data);
      if (msg.threadParentId) {
        setInlineReplies((prev) => {
          if (!prev[msg.threadParentId!]) return prev;
          if (prev[msg.threadParentId!].some((r) => r.id === msg.id)) return prev;
          return { ...prev, [msg.threadParentId!]: [...prev[msg.threadParentId!], msg] };
        });
        return;
      }
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      markRoomRead(room.id).catch(() => {});
    });

    es.addEventListener("close", () => es.close());

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [room.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function loadInlineReplies(messageId: string) {
    fetch(`/api/rooms/${room.id}/thread/${messageId}`)
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
      }
      return next;
    });
  }

  function handleReaction(messageId: string, emoji: string) {
    startTransition(() => toggleReaction(messageId, room.id, emoji));
  }

  const grouped = buildGrouped(messages);
  const title = roomTitle(room);

  return (
    <div className="flex flex-col h-[calc(100dvh-220px)] bg-white">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-200 shrink-0">
        <Link href="/messages" className="md:hidden text-sm text-dark-slate/50 hover:text-seagrass mr-1">
          ←
        </Link>
        {room.type === "DM" && room.otherUsers[0] && (
          <>
            {room.otherUsers[0].image ? (
              <Image src={room.otherUsers[0].image} alt="" width={28} height={28} className="rounded-full object-cover" unoptimized />
            ) : (
              <div className="w-7 h-7 rounded-full bg-dry-sage flex items-center justify-center text-xs font-semibold text-dark-slate">
                {initialsOf(room.otherUsers[0].name)}
              </div>
            )}
            <PresenceDot userId={room.otherUsers[0].id} />
          </>
        )}
        <span className="font-bold text-base text-gray-900">{title}</span>
        {room.postingPolicy === "LEADS_ONLY" && (
          <span className="text-xs bg-coral/10 text-coral px-2 py-0.5 rounded-full ml-1">
            Tillkännagivanden
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-2 flex flex-col">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-8">
            Inga meddelanden ännu. {canPost ? "Starta diskussionen!" : ""}
          </p>
        ) : (
          grouped.map((m) => {
            const isActiveThread = expandedThreads.has(m.id);
            return (
              <div
                key={m.id}
                className={`relative group flex items-start gap-0 px-4 py-0.5 hover:bg-gray-50 transition-colors ${
                  m.isGrouped ? "" : "mt-2"
                } ${isActiveThread ? "pb-2" : ""}`}
              >
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
                </div>

                {m.isGrouped ? (
                  <div className="w-9 shrink-0 self-start mt-1 text-right pr-1">
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-400 leading-none">
                      {new Date(m.createdAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0 mt-0.5 overflow-hidden relative">
                    {m.author.image ? (
                      <Image src={m.author.image} fill className="object-cover" alt="" unoptimized />
                    ) : (
                      initialsOf(m.author.name)
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0 ml-3">
                  {!m.isGrouped && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-sm font-bold text-gray-900">{m.author.name ?? "Okänd"}</span>
                      <span className="text-xs text-gray-400">{timeLabel(m.createdAt)}</span>
                    </div>
                  )}
                  {renderBody(m.body)}

                  {(() => {
                    const likeCount = m.reactions.filter((r) => r.emoji === FEED_LIKE_EMOJI).length;
                    const likedByMe = m.reactions.some((r) => r.emoji === FEED_LIKE_EMOJI && r.userId === currentUserId);
                    return (
                      <div className="mt-1 flex items-center gap-4">
                        <button
                          onClick={() => handleReaction(m.id, FEED_LIKE_EMOJI)}
                          className={`flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer ${
                            likedByMe ? "text-coral" : "text-gray-400 hover:text-coral"
                          }`}
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
                    canAdd={canPost}
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
                              initialsOf(r.author.name)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xs font-semibold text-gray-900">{r.author.name ?? "Okänd"}</span>
                              <span className="text-[10px] text-gray-400">{timeLabel(r.createdAt)}</span>
                            </div>
                            <div className="text-sm">{renderBody(r.body)}</div>
                          </div>
                        </div>
                      ))}
                      {canPost && (
                        <MessageComposer
                          roomId={room.id}
                          threadParentId={m.id}
                          onSent={() => loadInlineReplies(m.id)}
                        />
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

      {canPost && (
        <div className="border-t border-gray-200 px-4 py-3 bg-white shrink-0">
          <MessageComposer roomId={room.id} />
        </div>
      )}
    </div>
  );
}

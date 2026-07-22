"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ReactionBar } from "@/components/ReactionBar";
import { renderBody } from "@/lib/renderBody";
import { toggleReaction, markRoomRead } from "../actions";
import { FEED_LIKE_EMOJI } from "@/lib/feedLikeEmoji";
import { MessageComposer } from "./MessageComposer";
import { ThreadPanel } from "./ThreadPanel";
import { timeLabel, initialsOf } from "./format";
import PresenceDot from "@/components/PresenceDot";
import type { MentionItem } from "@/components/mentionSuggestion";
import FlagContentButton from "@/components/FlagContentButton";

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
  isAi?: boolean;
};

type RoomInfo = {
  id: string;
  type: "DM" | "GROUP" | "PROJECT_CHANNEL" | "ORG_CHANNEL" | "IDEA_THREAD";
  name: string | null;
  postingPolicy: "ALL_MEMBERS" | "LEADS_ONLY";
  otherUsers: { id: string; name: string | null; image: string | null }[];
};

type Props = {
  room: RoomInfo;
  initialMessages: MessageRow[];
  currentUserId: string | null;
  canPost: boolean;
  mentionables?: MentionItem[];
};

function roomTitle(room: RoomInfo) {
  if (room.type === "DM") return room.otherUsers[0]?.name ?? "?";
  if (room.type === "GROUP") return room.name ?? room.otherUsers.map((u) => u.name).join(", ");
  if (room.type === "IDEA_THREAD") return room.name ?? "Idésession";
  return room.name ? `#${room.name}` : room.type === "ORG_CHANNEL" ? "Arbetsrum" : "Kanal";
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "long" });
}

function buildGrouped(messages: MessageRow[]) {
  return messages.map((m, i) => {
    const prev = messages[i - 1];
    const isGrouped =
      !!prev &&
      prev.authorId === m.authorId &&
      new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
    const isNewDay = !prev || dateLabel(prev.createdAt) !== dateLabel(m.createdAt);
    return { ...m, isGrouped: isGrouped && !isNewDay, isNewDay };
  });
}

const QUICK_REACTIONS = [FEED_LIKE_EMOJI, "❤️", "😄", "🎉", "😮"];

export function RoomShell({ room, initialMessages, currentUserId, canPost, mentionables }: Props) {
  const t = useTranslations("Messages");
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [, startTransition] = useTransition();
  const [activeThread, setActiveThread] = useState<MessageRow | null>(null);
  const [threadReplies, setThreadReplies] = useState<MessageRow[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (currentUserId) markRoomRead(room.id).catch(() => {});
  }, [room.id, currentUserId]);

  function loadThreadReplies(messageId: string) {
    fetch(`/api/rooms/${room.id}/thread/${messageId}`)
      .then((r) => r.json())
      .then((data) => setThreadReplies(data))
      .catch(() => {});
  }

  function openThread(message: MessageRow) {
    setActiveThread(message);
    loadThreadReplies(message.id);
  }

  useEffect(() => {
    if (esRef.current) esRef.current.close();
    const es = new EventSource(`/api/rooms/${room.id}/sse`);
    esRef.current = es;

    es.addEventListener("message", (e) => {
      const msg: MessageRow = JSON.parse(e.data);
      if (msg.threadParentId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.threadParentId ? { ...m, _count: { threadReplies: m._count.threadReplies + 1 } } : m
          )
        );
        setActiveThread((current) => {
          if (current?.id !== msg.threadParentId) return current;
          setThreadReplies((prev) => (prev.some((r) => r.id === msg.id) ? prev : [...prev, msg]));
          return current;
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

  function handleReaction(messageId: string, emoji: string) {
    if (!currentUserId) return; // reaction controls are hidden for logged-out viewers anyway
    const userId = currentUserId;
    startTransition(() => toggleReaction(messageId, room.id, emoji));
    setMessages((prev) => prev.map((m) => (m.id === messageId ? optimisticToggle(m, messageId, emoji, userId) : m)));
    setActiveThread((current) => (current && current.id === messageId ? optimisticToggle(current, messageId, emoji, userId) : current));
    setThreadReplies((prev) => prev.map((r) => (r.id === messageId ? optimisticToggle(r, messageId, emoji, userId) : r)));
  }

  function optimisticToggle(m: MessageRow, messageId: string, emoji: string, userId: string): MessageRow {
    if (m.id !== messageId) return m;
    const already = m.reactions.some((r) => r.emoji === emoji && r.userId === userId);
    return {
      ...m,
      reactions: already
        ? m.reactions.filter((r) => !(r.emoji === emoji && r.userId === userId))
        : [...m.reactions, { emoji, userId }],
    };
  }

  const grouped = buildGrouped(messages);
  const title = roomTitle(room);
  const canReply = room.type === "PROJECT_CHANNEL" || room.type === "ORG_CHANNEL";

  return (
    <div className="flex">
      <div className={`${activeThread ? "hidden md:flex" : "flex"} flex-col h-[calc(100dvh-220px)] bg-white flex-1 min-w-0`}>
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
              const isOwn = m.authorId === currentUserId;
              return (
                <div key={m.id}>
                  {m.isNewDay && (
                    <div className="flex justify-center my-3">
                      <span className="text-[11px] font-medium text-dark-slate/40 bg-gray-50 px-3 py-1 rounded-full">
                        {dateLabel(m.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className={`flex px-4 ${isOwn ? "justify-end" : "justify-start"} ${m.isGrouped ? "mt-0.5" : "mt-3"}`}>
                    {!isOwn && (
                      <div className="w-9 shrink-0 mr-2 self-end">
                        {!m.isGrouped ? (
                          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 overflow-hidden relative">
                            {m.author.image ? (
                              <Image src={m.author.image} fill className="object-cover" alt="" unoptimized />
                            ) : (
                              initialsOf(m.author.name)
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}

                    <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                      {!m.isGrouped && (
                        <div className="flex items-baseline gap-2 mb-0.5 px-1">
                          {!isOwn && <span className="text-sm font-bold text-gray-900">{m.author.name ?? "Okänd"}</span>}
                          {m.isAi && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-seagrass bg-seagrass/10 rounded px-1.5 py-0.5">
                              AI
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{timeLabel(m.createdAt)}</span>
                        </div>
                      )}

                      <div className="relative inline-grid max-w-full group/bubble">
                        {canPost && (
                          <div
                            className={`absolute -top-4 ${isOwn ? "right-0" : "left-0"} hidden group-hover/bubble:flex items-center bg-white border border-gray-200 rounded-lg shadow-md z-20 overflow-hidden`}
                          >
                            {QUICK_REACTIONS.map((e) => (
                              <button
                                key={e}
                                type="button"
                                onClick={() => handleReaction(m.id, e)}
                                className="px-2 py-1.5 hover:bg-gray-100 text-base transition-colors"
                                title={e === FEED_LIKE_EMOJI ? "Gilla" : "Reagera"}
                              >
                                {e}
                              </button>
                            ))}
                            {canReply && (
                              <>
                                <span className="w-px h-5 bg-gray-200 mx-0.5" />
                                <button
                                  type="button"
                                  onClick={() => openThread(m)}
                                  className="px-2 py-1.5 hover:bg-gray-100 text-sm text-dark-slate/60 hover:text-seagrass transition-colors"
                                  title={t("reply")}
                                >
                                  💬
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        <div
                          className={`rounded-2xl px-3 py-2 text-dark-slate ${isOwn ? "bg-seagrass/10" : "bg-gray-50"}`}
                        >
                          {renderBody(m.body)}
                        </div>

                        {(m.reactions.length > 0 || (canReply && m._count.threadReplies > 0)) && (
                          <div
                            className={`-mt-[3px] ${
                              isOwn ? "justify-self-end" : "justify-self-start"
                            } z-10 flex flex-wrap max-w-full items-center gap-2`}
                          >
                            {canReply && m._count.threadReplies > 0 && (
                              <button
                                onClick={() => openThread(m)}
                                className={`inline-flex items-center -translate-y-0.5 px-2.5 py-1 rounded-full text-xs font-medium hover:underline bg-white border border-muted-teal/20 ${
                                  activeThread?.id === m.id ? "text-seagrass font-semibold" : "text-seagrass/80"
                                }`}
                              >
                                {m._count.threadReplies} {t("replies").toLowerCase()}
                              </button>
                            )}
                            {m.reactions.length > 0 && (
                              <ReactionBar
                                reactions={m.reactions}
                                currentUserId={currentUserId}
                                canAdd={canPost}
                                onToggle={(emoji) => handleReaction(m.id, emoji)}
                                bare
                              />
                            )}
                          </div>
                        )}
                      </div>
                      {currentUserId && (
                        <div className={isOwn ? "self-end" : "self-start"}>
                          <FlagContentButton targetType="Message" targetId={m.id} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {canPost && (
          <div className="px-4 py-3 bg-white shrink-0">
            <MessageComposer roomId={room.id} mentionables={mentionables} />
          </div>
        )}
      </div>

      {activeThread && (
        <ThreadPanel
          roomId={room.id}
          parent={messages.find((m) => m.id === activeThread.id) ?? activeThread}
          replies={threadReplies}
          currentUserId={currentUserId}
          canPost={canPost}
          mentionables={mentionables}
          onClose={() => setActiveThread(null)}
          onReaction={handleReaction}
          onReplySent={() => loadThreadReplies(activeThread.id)}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ReactionBar } from "@/components/ReactionBar";
import { renderBody } from "@/lib/renderBody";
import { toggleReaction, markRoomRead, editRoomMessage, deleteRoomMessage } from "../actions";
import { FEED_LIKE_EMOJI } from "@/lib/feedLikeEmoji";
import { MessageComposer } from "./MessageComposer";
import { ThreadPanel } from "./ThreadPanel";
import { timeLabel, initialsOf } from "./format";
import PresenceDot from "@/components/PresenceDot";
import { usePresence } from "@/components/usePresence";
import type { MentionItem } from "@/components/mentionSuggestion";
import FlagContentButton from "@/components/FlagContentButton";

export type MessageRow = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  threadParentId: string | null;
  authorId: string;
  author: { id: string; name: string | null; image: string | null };
  reactions: { emoji: string; userId: string }[];
  _count: { threadReplies: number };
  isAi?: boolean;
  attachments?: { id: string; key: string; name: string; mimeType: string; size: number }[];
};

type RoomInfo = {
  id: string;
  type: "DM" | "GROUP" | "PROJECT_CHANNEL" | "ORG_CHANNEL" | "IDEA_THREAD";
  name: string | null;
  postingPolicy: "ALL_MEMBERS" | "LEADS_ONLY";
  otherUsers: { id: string; name: string | null; image: string | null }[];
  participants: { userId: string; lastReadAt: string }[];
  projectId?: string | null;
  organisationId?: string | null;
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
const TYPING_EXPIRY_MS = 4000;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function typingLabel(names: string[]): string {
  if (names.length === 1) return `${names[0]} skriver…`;
  if (names.length === 2) return `${names[0]} och ${names[1]} skriver…`;
  return "Flera skriver…";
}

export function RoomShell({ room, initialMessages, currentUserId, canPost, mentionables }: Props) {
  const t = useTranslations("Messages");
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [, startTransition] = useTransition();
  const [activeThread, setActiveThread] = useState<MessageRow | null>(null);
  const [threadReplies, setThreadReplies] = useState<MessageRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [scrollToReplyId, setScrollToReplyId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [readMarkers, setReadMarkers] = useState<Map<string, string>>(
    () => new Map(room.participants.map((p) => [p.userId, p.lastReadAt]))
  );
  const dmOtherUserId = room.type === "DM" ? room.otherUsers[0]?.id : undefined;
  const presence = usePresence(dmOtherUserId ? [dmOtherUserId] : []);

  function startEdit(m: MessageRow) {
    setConfirmDeleteId(null);
    setEditingId(m.id);
    setEditingBody(m.body.replace(/<[^>]*>/g, ""));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingBody("");
  }

  function saveEdit(m: MessageRow) {
    const trimmed = editingBody.trim();
    if (!trimmed) return;
    startTransition(() => editRoomMessage(room.id, m.id, trimmed));
    cancelEdit();
  }

  function handleDelete(messageId: string) {
    startTransition(() => deleteRoomMessage(room.id, messageId));
    setConfirmDeleteId(null);
  }

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

  // Deep-links from a notification (?m=<messageId>, plus ?thread=<parentId>
  // for replies, which aren't visible until their thread is opened). Runs
  // once against the initial SSR-loaded messages — [] on purpose, so it
  // doesn't re-fire every time `messages` changes from live SSE updates.
  useEffect(() => {
    const targetMessageId = searchParams.get("m");
    if (!targetMessageId) return;
    const targetThreadId = searchParams.get("thread");

    if (targetThreadId) {
      const parent = messages.find((m) => m.id === targetThreadId);
      if (parent) {
        openThread(parent);
        setScrollToReplyId(targetMessageId);
      }
      return;
    }

    setHighlightId(targetMessageId);
    requestAnimationFrame(() => {
      document.getElementById(`msg-${targetMessageId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    const timeout = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (esRef.current) esRef.current.close();
    typingTimeoutsRef.current.forEach(clearTimeout);
    typingTimeoutsRef.current.clear();
    setTypingUsers(new Map());
    const es = new EventSource(`/api/rooms/${room.id}/sse`);
    esRef.current = es;

    es.addEventListener("message", (e) => {
      const data = JSON.parse(e.data);

      if (data.type === "read") {
        setReadMarkers((prev) => new Map(prev).set(data.userId, data.lastReadAt));
        return;
      }

      if (data.type === "typing") {
        if (data.userId === currentUserId) return;
        setTypingUsers((prev) => new Map(prev).set(data.userId, data.name ?? "Någon"));
        clearTimeout(typingTimeoutsRef.current.get(data.userId));
        typingTimeoutsRef.current.set(
          data.userId,
          setTimeout(() => {
            setTypingUsers((prev) => {
              const next = new Map(prev);
              next.delete(data.userId);
              return next;
            });
          }, TYPING_EXPIRY_MS)
        );
        return;
      }

      const { type, message: msg }: { type: "created" | "updated"; message: MessageRow } = data;

      if (type === "updated") {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
        setThreadReplies((prev) => prev.map((r) => (r.id === msg.id ? msg : r)));
        setActiveThread((current) => (current?.id === msg.id ? msg : current));
        return;
      }

      clearTimeout(typingTimeoutsRef.current.get(msg.authorId));
      typingTimeoutsRef.current.delete(msg.authorId);
      setTypingUsers((prev) => {
        if (!prev.has(msg.authorId)) return prev;
        const next = new Map(prev);
        next.delete(msg.authorId);
        return next;
      });

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
      typingTimeoutsRef.current.forEach(clearTimeout);
      typingTimeoutsRef.current.clear();
    };
  }, [room.id, currentUserId]);

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

  // "Seen" ticks reuse RoomParticipant.lastReadAt (already updated whenever
  // a room is opened) rather than a dedicated per-message receipts table —
  // only computed for the sender's own latest message to avoid a tick on
  // every bubble.
  function seenCountFor(message: MessageRow): number {
    let count = 0;
    readMarkers.forEach((lastReadAt, userId) => {
      if (userId === message.authorId) return;
      if (new Date(lastReadAt) >= new Date(message.createdAt)) count++;
    });
    return count;
  }

  const grouped = buildGrouped(messages);
  const title = roomTitle(room);
  const canReply = room.type === "PROJECT_CHANNEL" || room.type === "ORG_CHANNEL";
  const lastOwnMessageId = [...messages].reverse().find((m) => m.authorId === currentUserId)?.id;

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
              <PresenceDot online={!!presence[room.otherUsers[0].id]} />
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
                <div key={m.id} id={`msg-${m.id}`}>
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
                        {canPost && !m.deletedAt && editingId !== m.id && (
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
                            {isOwn && (
                              <>
                                <span className="w-px h-5 bg-gray-200 mx-0.5" />
                                <button
                                  type="button"
                                  onClick={() => startEdit(m)}
                                  className="px-2 py-1.5 hover:bg-gray-100 text-sm text-dark-slate/60 hover:text-seagrass transition-colors"
                                  title="Redigera"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(m.id)}
                                  className="px-2 py-1.5 hover:bg-gray-100 text-sm text-dark-slate/60 hover:text-watermelon transition-colors"
                                  title="Ta bort"
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        <div
                          className={`rounded-2xl px-3 py-2 text-dark-slate transition-shadow ${isOwn ? "bg-seagrass/10" : "bg-gray-50"} ${
                            highlightId === m.id ? "ring-2 ring-seagrass" : ""
                          }`}
                        >
                          {m.deletedAt ? (
                            <p className="text-sm italic text-dark-slate/40">Meddelandet togs bort</p>
                          ) : editingId === m.id ? (
                            <div className="flex flex-col gap-1.5 min-w-[200px]">
                              <textarea
                                autoFocus
                                value={editingBody}
                                onChange={(e) => setEditingBody(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    saveEdit(m);
                                  }
                                  if (e.key === "Escape") cancelEdit();
                                }}
                                rows={2}
                                className="w-full text-sm bg-white border border-muted-teal/30 rounded-lg px-2 py-1.5 resize-none text-dark-slate focus:outline-none focus:border-seagrass"
                              />
                              <div className="flex items-center gap-3 text-xs">
                                <button type="button" onClick={() => saveEdit(m)} className="text-seagrass font-semibold hover:underline">
                                  Spara
                                </button>
                                <button type="button" onClick={cancelEdit} className="text-dark-slate/50 hover:underline">
                                  Avbryt
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {renderBody(m.body)}
                              {m.editedAt && <span className="text-[10px] text-dark-slate/30 ml-1">(redigerat)</span>}
                              {m.attachments && m.attachments.length > 0 && (
                                <div className={`flex flex-col gap-1.5 ${m.body ? "mt-1.5" : ""}`}>
                                  {m.attachments.map((a) =>
                                    a.mimeType.startsWith("image/") ? (
                                      <a key={a.id} href={`/api/files/${a.key}`} target="_blank" rel="noopener noreferrer">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={`/api/files/${a.key}`}
                                          alt={a.name}
                                          className="max-w-[240px] max-h-[240px] rounded-lg object-cover border border-gray-200"
                                        />
                                      </a>
                                    ) : (
                                      <a
                                        key={a.id}
                                        href={`/api/files/${a.key}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-dark-slate/70 hover:border-seagrass transition-colors"
                                      >
                                        <span>📎</span>
                                        <span className="truncate max-w-[160px]">{a.name}</span>
                                        <span className="text-dark-slate/30 shrink-0">{formatFileSize(a.size)}</span>
                                      </a>
                                    )
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {confirmDeleteId === m.id && (
                          <div className="mt-1 flex items-center gap-2 text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                            <span className="text-dark-slate/60">Ta bort meddelandet?</span>
                            <button type="button" onClick={() => handleDelete(m.id)} className="text-watermelon font-semibold hover:underline">
                              Ja
                            </button>
                            <button type="button" onClick={() => setConfirmDeleteId(null)} className="text-dark-slate/50 hover:underline">
                              Avbryt
                            </button>
                          </div>
                        )}

                        {!m.deletedAt && (m.reactions.length > 0 || (canReply && m._count.threadReplies > 0)) && (
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
                      {isOwn && m.id === lastOwnMessageId && !m.deletedAt && seenCountFor(m) > 0 && (
                        <span className="self-end text-[10px] text-dark-slate/30 mt-0.5">
                          {room.type === "DM" ? "Sett" : `Sett av ${seenCountFor(m)}`}
                        </span>
                      )}
                      {currentUserId && !m.deletedAt && (
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

        {typingUsers.size > 0 && (
          <div className="px-4 pt-1 text-xs text-dark-slate/40 italic shrink-0">
            {typingLabel([...typingUsers.values()])}
          </div>
        )}

        {canPost && (
          <div className="px-4 py-3 bg-white shrink-0">
            <MessageComposer
              roomId={room.id}
              mentionables={mentionables}
              projectId={room.type === "PROJECT_CHANNEL" ? room.projectId : undefined}
              organisationId={room.type === "ORG_CHANNEL" ? room.organisationId : undefined}
            />
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
          scrollToReplyId={scrollToReplyId}
          onScrolledToReply={() => setScrollToReplyId(null)}
        />
      )}
    </div>
  );
}

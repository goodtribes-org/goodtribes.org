"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { renderBody } from "@/lib/renderBody";
import { ReactionBar } from "@/components/ReactionBar";
import { MessageComposer } from "./MessageComposer";
import { timeLabel, initialsOf } from "./format";
import type { MessageRow } from "./RoomShell";
import type { MentionItem } from "@/components/mentionSuggestion";
import FlagContentButton from "@/components/FlagContentButton";
import { editRoomMessage, deleteRoomMessage } from "../actions";

type Props = {
  roomId: string;
  parent: MessageRow;
  replies: MessageRow[];
  currentUserId: string | null;
  canPost: boolean;
  mentionables?: MentionItem[];
  onClose: () => void;
  onReaction: (messageId: string, emoji: string) => void;
  onReplySent: () => void;
};

export function ThreadPanel({ roomId, parent, replies, currentUserId, canPost, mentionables, onClose, onReaction, onReplySent }: Props) {
  const t = useTranslations("Messages");
  const [, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
    startTransition(() => editRoomMessage(roomId, m.id, trimmed));
    cancelEdit();
  }

  function handleDelete(messageId: string) {
    startTransition(() => deleteRoomMessage(roomId, messageId));
    setConfirmDeleteId(null);
  }

  function renderMessageBody(m: MessageRow) {
    if (m.deletedAt) return <p className="text-sm italic text-dark-slate/40">Meddelandet togs bort</p>;
    if (editingId === m.id) {
      return (
        <div className="flex flex-col gap-1.5">
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
      );
    }
    return (
      <>
        {renderBody(m.body)}
        {m.editedAt && <span className="text-[10px] text-dark-slate/30 ml-1">(redigerat)</span>}
      </>
    );
  }

  function renderMessageActions(m: MessageRow) {
    if (m.authorId !== currentUserId || m.deletedAt || editingId === m.id) return null;
    return (
      <div className="flex items-center gap-2 text-[11px]">
        <button type="button" onClick={() => startEdit(m)} className="text-dark-slate/40 hover:text-seagrass transition-colors">
          Redigera
        </button>
        {confirmDeleteId === m.id ? (
          <span className="flex items-center gap-1.5">
            <span className="text-dark-slate/40">Ta bort?</span>
            <button type="button" onClick={() => handleDelete(m.id)} className="text-watermelon font-semibold hover:underline">
              Ja
            </button>
            <button type="button" onClick={() => setConfirmDeleteId(null)} className="text-dark-slate/40 hover:underline">
              Avbryt
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmDeleteId(m.id)} className="text-dark-slate/40 hover:text-watermelon transition-colors">
            Ta bort
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full md:w-96 shrink-0 border-l border-gray-200 flex flex-col h-[calc(100dvh-220px)] bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
        <span className="font-bold text-base text-gray-900">{t("reply")}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("closeThread")}
          className="text-dark-slate/40 hover:text-dark-slate transition-colors text-xl leading-none px-1"
        >
          ×
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-3 px-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0 overflow-hidden relative">
            {parent.author.image ? (
              <Image src={parent.author.image} fill className="object-cover" alt="" unoptimized />
            ) : (
              initialsOf(parent.author.name)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-sm font-bold text-gray-900">{parent.author.name ?? "Okänd"}</span>
              <span className="text-xs text-gray-400">{timeLabel(parent.createdAt)}</span>
            </div>
            {renderMessageBody(parent)}
            {!parent.deletedAt && (
              <ReactionBar
                reactions={parent.reactions}
                currentUserId={currentUserId}
                canAdd={canPost}
                onToggle={(emoji) => onReaction(parent.id, emoji)}
              />
            )}
            <div className="flex items-center gap-3 mt-0.5">
              {currentUserId && !parent.deletedAt && <FlagContentButton targetType="Message" targetId={parent.id} />}
              {renderMessageActions(parent)}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-2">
            {replies.length > 0 ? `${replies.length} ${t("replies").toLowerCase()}` : t("replies")}
          </p>
          <div className="space-y-3">
            {replies.map((r) => (
              <div key={r.id} className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-600 shrink-0 overflow-hidden relative">
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
                  <div className="text-sm">{renderMessageBody(r)}</div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {currentUserId && !r.deletedAt && <FlagContentButton targetType="Message" targetId={r.id} />}
                    {renderMessageActions(r)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {canPost && (
        <div className="border-t border-gray-200 px-4 py-3 bg-white shrink-0">
          <MessageComposer roomId={roomId} threadParentId={parent.id} onSent={onReplySent} mentionables={mentionables} />
        </div>
      )}
    </div>
  );
}

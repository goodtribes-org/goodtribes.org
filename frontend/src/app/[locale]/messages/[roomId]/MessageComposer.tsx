"use client";

import { useTransition, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { sendRoomMessage, sendTypingSignal } from "../actions";
import type { MentionItem } from "@/components/mentionSuggestion";
import { AttachmentPicker, type UploadedAttachment } from "./AttachmentPicker";

const TYPING_SIGNAL_THROTTLE_MS = 2000;

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

function isEmpty(html: string) {
  return !html || html.replace(/<[^>]*>/g, "").trim() === "";
}

// getRoomAccess/assertValidBody throw untranslated internal strings — map
// those two literals to the generic sendError copy instead of surfacing
// raw English. Everything else (guardSocialAction's SUSPENDED/RATE_LIMITED)
// already has real Swedish copy, so show it as-is.
const UNTRANSLATED_ERRORS = new Set(["Forbidden", "Invalid message"]);

type Props = {
  roomId: string;
  threadParentId?: string;
  onSent?: () => void;
  mentionables?: MentionItem[];
  projectId?: string | null;
  organisationId?: string | null;
};

export function MessageComposer({ roomId, threadParentId, onSent, mentionables, projectId, organisationId }: Props) {
  const t = useTranslations("Messages");
  const [body, setBody] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [isPending, startTransition] = useTransition();
  const lastTypingSentAt = useRef(0);

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function handleChange(html: string) {
    setBody(html);
    const now = Date.now();
    if (now - lastTypingSentAt.current > TYPING_SIGNAL_THROTTLE_MS) {
      lastTypingSentAt.current = now;
      sendTypingSignal(roomId).catch(() => {});
    }
  }

  function submit() {
    const canSubmit = !isEmpty(body) || attachments.length > 0;
    if (!canSubmit || isPending) return;
    startTransition(async () => {
      try {
        await sendRoomMessage(roomId, body, threadParentId, attachments.map((a) => a.id));
        setBody("");
        setEditorKey((k) => k + 1);
        setAttachments([]);
        setError(null);
        onSent?.();
      } catch (e) {
        const message = e instanceof Error ? e.message : null;
        setError(message && !UNTRANSLATED_ERRORS.has(message) ? message : t("sendError"));
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-1.5"
    >
      {error && <p className="text-xs text-watermelon">{error}</p>}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((a) => (
            <span
              key={a.id}
              className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-dry-sage/30 text-xs text-dark-slate/70"
            >
              <span className="truncate max-w-[140px]">{a.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(a.id)}
                aria-label={`Ta bort ${a.name}`}
                className="text-dark-slate/40 hover:text-watermelon"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0">
          <RichTextEditor
            key={editorKey}
            content={body}
            onChange={handleChange}
            compact
            mentionables={mentionables}
            collapsibleToolbar
            onSubmit={submit}
          />
        </div>
        <AttachmentPicker
          projectId={projectId}
          organisationId={organisationId}
          disabled={isPending}
          onUploaded={(a) => setAttachments((prev) => [...prev, a])}
          onError={(message) => setError(message)}
        />
        <button
          type="submit"
          disabled={isPending || (isEmpty(body) && attachments.length === 0)}
          aria-label="Skicka"
          title="Skicka"
          className="shrink-0 w-9 h-9 rounded-full bg-coral text-white flex items-center justify-center hover:bg-watermelon transition-colors disabled:opacity-40 mb-1"
        >
          {isPending ? (
            <span className="w-3.5 h-3.5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 translate-x-[1px]">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}

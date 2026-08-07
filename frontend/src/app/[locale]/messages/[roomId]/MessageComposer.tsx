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
  const tComposer = useTranslations("MessageComposer");
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
                aria-label={tComposer("removeAttachmentAriaLabel", { name: a.name })}
                className="text-dark-slate/40 hover:text-watermelon"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <RichTextEditor
        key={editorKey}
        content={body}
        onChange={handleChange}
        compact
        mentionables={mentionables}
        collapsibleToolbar
        onSubmit={submit}
        trailingControls={
          <>
            <AttachmentPicker
              variant="image"
              projectId={projectId}
              organisationId={organisationId}
              disabled={isPending}
              onUploaded={(a) => setAttachments((prev) => [...prev, a])}
              onError={(message) => setError(message)}
            />
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
              aria-label={tComposer("sendLabel")}
              title={tComposer("sendLabel")}
              className="w-8 h-8 shrink-0 rounded-full bg-coral text-white flex items-center justify-center hover:bg-watermelon transition-colors disabled:opacity-40"
            >
              {isPending ? (
                <span className="w-3.5 h-3.5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px] translate-x-[1px]">
                  <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                </svg>
              )}
            </button>
          </>
        }
      />
    </form>
  );
}

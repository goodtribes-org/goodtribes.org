"use client";

import { useTransition, useState } from "react";
import dynamic from "next/dynamic";
import { sendRoomMessage } from "../actions";
import type { MentionItem } from "@/components/mentionSuggestion";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

function isEmpty(html: string) {
  return !html || html.replace(/<[^>]*>/g, "").trim() === "";
}

type Props = {
  roomId: string;
  threadParentId?: string;
  onSent?: () => void;
  mentionables?: MentionItem[];
};

export function MessageComposer({ roomId, threadParentId, onSent, mentionables }: Props) {
  const [body, setBody] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (isEmpty(body) || isPending) return;
    startTransition(async () => {
      await sendRoomMessage(roomId, body, threadParentId);
      setBody("");
      setEditorKey((k) => k + 1);
      onSent?.();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2"
    >
      <div className="flex-1 min-w-0">
        <RichTextEditor
          key={editorKey}
          content={body}
          onChange={setBody}
          compact
          mentionables={mentionables}
          collapsibleToolbar
          onSubmit={submit}
        />
      </div>
      <button
        type="submit"
        disabled={isPending || isEmpty(body)}
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
    </form>
  );
}

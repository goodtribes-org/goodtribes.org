"use client";

import { useTransition, useState } from "react";
import dynamic from "next/dynamic";
import { sendMessage, sendThreadReply } from "../actions";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

function isEmpty(html: string) {
  return !html || html.replace(/<[^>]*>/g, "").trim() === "";
}

type Props = {
  channelId: string;
  projectSlug: string;
  threadParentId?: string;
  onSent?: () => void;
};

export function MessageInput({ channelId, projectSlug, threadParentId, onSent }: Props) {
  const [body, setBody] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEmpty(body)) return;
    startTransition(async () => {
      if (threadParentId) {
        await sendThreadReply(channelId, threadParentId, projectSlug, body);
      } else {
        await sendMessage(channelId, projectSlug, body);
      }
      setBody("");
      setEditorKey((k) => k + 1);
      onSent?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <RichTextEditor
        key={editorKey}
        content={body}
        onChange={setBody}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || isEmpty(body)}
          className="px-4 py-2 bg-coral text-white text-sm font-medium rounded-md hover:bg-watermelon transition-colors disabled:opacity-60"
        >
          {isPending ? "Skickar…" : "Skicka"}
        </button>
      </div>
    </form>
  );
}

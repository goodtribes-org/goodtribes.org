"use client";

import { useTransition, useState } from "react";
import dynamic from "next/dynamic";
import { sendRoomMessage } from "../actions";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

function isEmpty(html: string) {
  return !html || html.replace(/<[^>]*>/g, "").trim() === "";
}

type Props = {
  roomId: string;
  threadParentId?: string;
  onSent?: () => void;
};

export function MessageComposer({ roomId, threadParentId, onSent }: Props) {
  const [body, setBody] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEmpty(body)) return;
    startTransition(async () => {
      await sendRoomMessage(roomId, body, threadParentId);
      setBody("");
      setEditorKey((k) => k + 1);
      onSent?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="border border-gray-300 rounded-xl overflow-hidden focus-within:border-seagrass focus-within:ring-1 focus-within:ring-seagrass/30 transition-all bg-white">
        <RichTextEditor key={editorKey} content={body} onChange={setBody} compact={!!threadParentId} />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || isEmpty(body)}
          className="px-4 py-1.5 bg-coral text-white text-sm font-medium rounded-lg hover:bg-watermelon transition-colors disabled:opacity-60"
        >
          {isPending ? "Skickar…" : "Skicka"}
        </button>
      </div>
    </form>
  );
}

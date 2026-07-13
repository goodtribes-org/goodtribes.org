"use client";

import { useState, useTransition } from "react";
import { sendDirectMessage } from "../actions";

type Props = {
  conversationId: string;
  placeholder: string;
  sendLabel: string;
  sendingLabel: string;
};

export function MessageComposer({ conversationId, placeholder, sendLabel, sendingLabel }: Props) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const toSend = body;
    setBody("");
    startTransition(async () => {
      await sendDirectMessage(conversationId, toSend);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 pt-3 border-t border-muted-teal/40">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
        rows={2}
        maxLength={10_000}
        placeholder={placeholder}
        disabled={isPending}
        className="flex-1 text-sm border border-muted-teal rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-seagrass/40 placeholder:text-dark-slate/30"
      />
      <button
        type="submit"
        disabled={isPending || !body.trim()}
        className="px-4 py-2 bg-seagrass text-white text-sm font-medium rounded-md hover:bg-seagrass/80 transition-colors disabled:opacity-50"
      >
        {isPending ? sendingLabel : sendLabel}
      </button>
    </form>
  );
}

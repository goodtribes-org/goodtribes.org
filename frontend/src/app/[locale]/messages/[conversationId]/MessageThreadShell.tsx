"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { markConversationRead } from "../actions";
import { MessageComposer } from "./MessageComposer";

type MessageRow = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
};

type OtherUser = { id: string; name: string | null; image: string | null } | null;

type Props = {
  conversationId: string;
  currentUserId: string;
  otherUser: OtherUser;
  initialMessages: MessageRow[];
};

export function MessageThreadShell({ conversationId, currentUserId, otherUser, initialMessages }: Props) {
  const t = useTranslations("Messages");
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const esRef = useRef<EventSource | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (esRef.current) esRef.current.close();

    const es = new EventSource(`/api/messages/${conversationId}/sse`);
    esRef.current = es;

    es.addEventListener("message", (e) => {
      const msg: MessageRow = JSON.parse(e.data);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      markConversationRead(conversationId).catch(() => {});
    });

    es.addEventListener("close", () => es.close());

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const otherName = otherUser?.name ?? "?";

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100dvh-220px)]">
      <div className="flex items-center gap-3 pb-4 border-b border-muted-teal/40 mb-4">
        <Link href="/messages" className="text-sm text-dark-slate/50 hover:text-seagrass">
          ←
        </Link>
        {otherUser?.image ? (
          <img src={otherUser.image} alt={otherName} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-dry-sage flex items-center justify-center text-xs font-semibold text-dark-slate">
            {otherName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <h1 className="text-lg font-semibold text-dark-slate">{otherName}</h1>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words ${
                  mine ? "bg-seagrass text-white" : "bg-dry-sage/40 text-dark-slate"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <MessageComposer
        conversationId={conversationId}
        placeholder={t("placeholder")}
        sendLabel={t("send")}
        sendingLabel={t("sending")}
      />
    </div>
  );
}

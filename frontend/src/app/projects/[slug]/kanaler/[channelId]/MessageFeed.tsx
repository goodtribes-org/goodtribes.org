"use client";

import { useEffect, useRef, useTransition } from "react";
import Image from "next/image";
import { ReactionBar } from "@/components/ReactionBar";
import { renderBody } from "@/lib/renderBody";
import { toggleReaction } from "../actions";
import { MessageInput } from "./MessageInput";
import type { MessageRow } from "./KanalerShell";

function timeLabel(iso: string) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just nu";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

type Props = {
  slug: string;
  channelId: string;
  channelName: string;
  channelType: string;
  messages: MessageRow[];
  isMember: boolean;
  isAdmin: boolean;
  currentUserId: string | null;
  openThreadId: string | null;
  onOpenThread: (id: string) => void;
  onSidebarToggle: () => void;
};

export function MessageFeed({
  slug,
  channelId,
  channelName,
  channelType,
  messages,
  isMember,
  isAdmin,
  currentUserId,
  openThreadId,
  onOpenThread,
  onSidebarToggle,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const canPost = isMember && (channelType !== "announcement" || isAdmin);

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full">
      {/* Channel header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-muted-teal/20 shrink-0">
        <button
          className="md:hidden mr-1 text-dark-slate/50 hover:text-dark-slate"
          onClick={onSidebarToggle}
        >
          ☰
        </button>
        <span className="text-dark-slate/40 font-semibold">#</span>
        <span className="font-semibold text-dark-slate">{channelName}</span>
        {channelType === "announcement" && (
          <span className="text-xs bg-coral/10 text-coral px-2 py-0.5 rounded-full">
            Tillkännagivanden
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
        {messages.length === 0 ? (
          <p className="text-sm text-dark-slate/40 italic text-center py-8">
            Inga meddelanden ännu.{" "}
            {canPost ? "Starta diskussionen!" : "Gå med i projektet för att skriva."}
          </p>
        ) : (
          messages.map((m) => {
            const initials = (m.author.name ?? "?")
              .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            const isActiveThread = m.id === openThreadId;

            return (
              <div
                key={m.id}
                className={`flex items-start gap-3 group rounded-lg px-2 py-1 -mx-2 transition-colors ${
                  isActiveThread ? "bg-dry-sage/20" : "hover:bg-dry-sage/10"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-dry-sage flex items-center justify-center text-xs font-semibold text-dark-slate shrink-0 overflow-hidden relative">
                  {m.author.image ? (
                    <Image src={m.author.image} fill className="object-cover" alt="" unoptimized />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-dark-slate">
                      {m.author.name ?? "Okänd"}
                    </span>
                    <span className="text-[10px] text-dark-slate/40">{timeLabel(m.createdAt)}</span>
                  </div>
                  {renderBody(m.body)}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <ReactionBar
                      reactions={m.reactions}
                      currentUserId={currentUserId}
                      canAdd={isMember}
                      onToggle={(emoji) =>
                        startTransition(() => toggleReaction(m.id, channelId, slug, emoji))
                      }
                    />
                    <button
                      onClick={() => onOpenThread(m.id)}
                      className="text-[10px] text-dark-slate/40 hover:text-seagrass flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {m._count.threadReplies > 0
                        ? `${m._count.threadReplies} svar i tråd →`
                        : "Svara i tråd"}
                    </button>
                    {m._count.threadReplies > 0 && (
                      <button
                        onClick={() => onOpenThread(m.id)}
                        className="text-[10px] text-seagrass hover:underline flex items-center gap-1 group-hover:hidden"
                      >
                        {m._count.threadReplies} svar →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canPost ? (
        <div className="border-t border-muted-teal/20 px-4 py-3 shrink-0">
          <MessageInput channelId={channelId} projectSlug={slug} />
        </div>
      ) : !isMember ? (
        <div className="border-t border-muted-teal/20 px-4 py-3 shrink-0">
          <p className="text-sm text-dark-slate/40 text-center">
            Gå med i projektet för att skriva.
          </p>
        </div>
      ) : null}
    </div>
  );
}

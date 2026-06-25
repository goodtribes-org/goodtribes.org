"use client";

import { useRef, useTransition, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { postMessage, generateInviteLink } from "./actions";

type Message = {
  id: string;
  body: string;
  createdAt: Date;
  author: { name: string | null; image: string | null };
};

function timeAgo(date: Date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function ChatBox({
  projectId,
  slug,
  messages,
  isMember,
  isOwnerOrAdmin,
}: {
  projectId: string;
  slug: string;
  messages: Message[];
  isMember: boolean;
  isOwnerOrAdmin: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const refresh = useCallback(() => router.refresh(), [router]);

  useEffect(() => {
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await postMessage(projectId, slug, formData);
      formRef.current?.reset();
    });
  }

  async function handleGenerateLink() {
    const link = await generateInviteLink(projectId, slug);
    if (link) setInviteLink(link);
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Invite link panel for owners/admins */}
      {isOwnerOrAdmin && (
        <div className="border border-muted-teal/30 rounded-lg p-3 bg-dry-sage/20">
          <p className="text-xs font-medium text-dark-slate mb-2">Invite link</p>
          {inviteLink ? (
            <div className="flex items-center gap-2">
              <code className="text-xs bg-white border border-muted-teal/40 rounded px-2 py-1 flex-1 truncate">
                {inviteLink}
              </code>
              <button
                onClick={handleCopy}
                className="text-xs px-3 py-1 rounded bg-seagrass text-white hover:bg-seagrass/80 transition-colors shrink-0"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateLink}
              className="text-xs text-coral hover:underline"
            >
              Generate invite link (valid 7 days) →
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex flex-col gap-3 min-h-[100px]">
        {messages.length === 0 ? (
          <p className="text-sm text-dark-slate/40 italic text-center py-6">
            No messages yet. {isMember ? "Start the conversation!" : "Join the project to chat."}
          </p>
        ) : (
          messages.map((m) => {
            const initials = (m.author.name ?? "?")
              .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={m.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-dry-sage flex items-center justify-center text-xs font-semibold text-dark-slate shrink-0">
                  {m.author.image
                    ? <img src={m.author.image} className="w-8 h-8 rounded-full object-cover" alt="" />
                    : initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-dark-slate">{m.author.name ?? "Unknown"}</span>
                    <span className="text-[10px] text-dark-slate/40">{timeAgo(m.createdAt)}</span>
                  </div>
                  <p className="text-sm text-dark-slate/80 whitespace-pre-wrap break-words">{m.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Post form */}
      {isMember && (
        <form ref={formRef} action={handleSubmit} className="flex gap-2 items-end border-t border-muted-teal/20 pt-3">
          <textarea
            name="body"
            required
            rows={2}
            placeholder="Write a message…"
            maxLength={2000}
            className="flex-1 border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
          />
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-coral text-white text-sm font-medium rounded-md hover:bg-watermelon transition-colors disabled:opacity-60 shrink-0"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}

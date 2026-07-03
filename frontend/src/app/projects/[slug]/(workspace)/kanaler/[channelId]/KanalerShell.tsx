"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markChannelRead } from "../actions";
import { ChannelSidebar } from "./ChannelSidebar";
import { MessageFeed } from "./MessageFeed";
import { ThreadPanel } from "./ThreadPanel";

export type ChannelRow = {
  id: string;
  name: string;
  type: string;
  order: number;
  pinned: boolean;
  description: string | null;
};

export type MessageRow = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  threadParentId: string | null;
  author: { id: string; name: string | null; image: string | null };
  reactions: { emoji: string; userId: string }[];
  _count: { threadReplies: number };
};

type Props = {
  slug: string;
  projectId: string;
  channels: ChannelRow[];
  currentChannelId: string;
  initialMessages: MessageRow[];
  isMember: boolean;
  isAdmin: boolean;
  currentUserId: string | null;
  unreadMap: Record<string, number>;
};

export function KanalerShell({
  slug,
  projectId,
  channels,
  currentChannelId,
  initialMessages,
  isMember,
  isAdmin,
  currentUserId,
  unreadMap,
}: Props) {
  const router = useRouter();
  const [activeChannelId, setActiveChannelId] = useState(currentChannelId);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [localUnread, setLocalUnread] = useState(unreadMap);
  const [showSidebar, setShowSidebar] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // When channel changes via URL, sync state and navigate
  useEffect(() => {
    if (activeChannelId !== currentChannelId) {
      router.push(`/projects/${slug}/kanaler/${activeChannelId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannelId]);

  // Re-sync messages when URL-driven channel change happens
  useEffect(() => {
    setMessages(initialMessages);
    setOpenThreadId(null);
  }, [currentChannelId, initialMessages]);

  // SSE subscription
  useEffect(() => {
    if (esRef.current) esRef.current.close();

    const es = new EventSource(
      `/api/projects/${slug}/kanaler/${activeChannelId}/sse`
    );
    esRef.current = es;

    es.addEventListener("message", (e) => {
      const msg: MessageRow = JSON.parse(e.data);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    es.addEventListener("close", () => {
      es.close();
    });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [activeChannelId, slug]);

  function handleChannelSelect(channelId: string) {
    setActiveChannelId(channelId);
    setOpenThreadId(null);
    setShowSidebar(false);
    setLocalUnread((prev) => ({ ...prev, [channelId]: 0 }));
    markChannelRead(channelId).catch(() => {});
  }

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-220px)] overflow-hidden bg-white">
      {/* Mobile sidebar toggle */}
      <button
        className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-muted-teal/20 text-sm font-medium text-dark-slate bg-dry-sage/10"
        onClick={() => setShowSidebar((s) => !s)}
      >
        <span>☰</span>
        <span>{activeChannel ? `#${activeChannel.name}` : "Kanaler"}</span>
      </button>

      {/* Sidebar */}
      <div className={`${showSidebar ? "flex" : "hidden"} md:flex flex-col w-full md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-muted-teal/20`}>
        <ChannelSidebar
          slug={slug}
          projectId={projectId}
          channels={channels}
          activeChannelId={activeChannelId}
          unreadMap={localUnread}
          isAdmin={isAdmin}
          onSelect={handleChannelSelect}
        />
      </div>

      {/* Main feed */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        <MessageFeed
          slug={slug}
          channelId={activeChannelId}
          channelName={activeChannel?.name ?? ""}
          channelType={activeChannel?.type ?? "text"}
          messages={messages}
          isMember={isMember}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          openThreadId={openThreadId}
          onOpenThread={setOpenThreadId}
          onSidebarToggle={() => setShowSidebar((s) => !s)}
        />

        {/* Thread panel */}
        {openThreadId && (
          <div className="hidden md:flex flex-col w-80 shrink-0 border-l border-muted-teal/20">
            <ThreadPanel
              slug={slug}
              channelId={activeChannelId}
              threadParentId={openThreadId}
              parentMessage={messages.find((m) => m.id === openThreadId) ?? null}
              isMember={isMember}
              currentUserId={currentUserId}
              onClose={() => setOpenThreadId(null)}
            />
          </div>
        )}
      </div>

      {/* Thread panel on mobile (bottom sheet) */}
      {openThreadId && (
        <div className="fixed bottom-0 left-0 right-0 h-3/4 z-50 flex flex-col md:hidden bg-white rounded-t-2xl shadow-2xl border-t border-muted-teal/20">
          <ThreadPanel
            slug={slug}
            channelId={activeChannelId}
            threadParentId={openThreadId}
            parentMessage={messages.find((m) => m.id === openThreadId) ?? null}
            isMember={isMember}
            currentUserId={currentUserId}
            onClose={() => setOpenThreadId(null)}
          />
        </div>
      )}
    </div>
  );
}

"use client";

// The two personal icons in the header (#366), the same size as Search:
// 💬 opens the conversation panel (badge: unread conversations — someone is
// waiting for your reply) and ⌂ goes to your own page, Mitt GoodTribes
// (badge: notifications you haven't seen — what's new since last time). The
// bell is gone: what happened to you is on your page, not a pinging icon.

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useUserEvents } from "@/components/UserEventsProvider";
import { openConversations, CONVERSATIONS_CHANGED_EVENT } from "@/components/ConversationsPanel";

export const NOTIFICATIONS_SEEN_EVENT = "gt:notifications:seen";
const POLL_MS = 30_000;

function Badge({ n, label }: { n: number; label: string }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold leading-none text-white" aria-label={label}>
      {n > 9 ? "9+" : n}
    </span>
  );
}

// Same size and stroke as SearchButton's magnifier, so the three read as one row.
const iconClass = "h-5 w-5";

export default function HeaderMine() {
  const t = useTranslations("Conversations");
  const pathname = usePathname();
  const eventSource = useUserEvents();
  const [unreadRooms, setUnreadRooms] = useState(0);
  const [newCount, setNewCount] = useState(0);

  const refreshRooms = useCallback(() => {
    fetch("/api/rooms/unread")
      .then((r) => (r.ok ? r.json() : { unreadRoomIds: [] }))
      .then((d) => setUnreadRooms((d.unreadRoomIds ?? []).length))
      .catch(() => {});
  }, []);

  const refreshNew = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setNewCount(d.filter((n: { read: boolean }) => !n.read).length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshRooms();
    refreshNew();
  }, [pathname, refreshRooms, refreshNew]);

  // Unread conversations: re-checked now and then, and when the panel opens one.
  useEffect(() => {
    const id = setInterval(refreshRooms, POLL_MS);
    window.addEventListener(CONVERSATIONS_CHANGED_EVENT, refreshRooms);
    window.addEventListener(NOTIFICATIONS_SEEN_EVENT, refreshNew);
    return () => {
      clearInterval(id);
      window.removeEventListener(CONVERSATIONS_CHANGED_EVENT, refreshRooms);
      window.removeEventListener(NOTIFICATIONS_SEEN_EVENT, refreshNew);
    };
  }, [refreshRooms, refreshNew]);

  // A notification arriving live bumps ⌂ (and a message one, 💬) straight away.
  useEffect(() => {
    if (!eventSource) return;
    function onNotification(e: MessageEvent) {
      setNewCount((n) => n + 1);
      try {
        const { notification } = JSON.parse(e.data) as { notification: { type: string } };
        if (notification.type.startsWith("room_")) refreshRooms();
      } catch {}
    }
    eventSource.addEventListener("notification", onNotification);
    return () => eventSource.removeEventListener("notification", onNotification);
  }, [eventSource, refreshRooms]);

  return (
    <>
      <button
        type="button"
        onClick={() => openConversations()}
        data-tour="nav-messages"
        className="relative shrink-0 p-1 text-dark-slate/60 transition-colors hover:text-dark-slate"
        aria-label={t("title")}
        title={t("title")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true">
          <path d="M21 11.5a8.5 8.5 0 01-12.6 7.4L3 20l1.2-4.6A8.5 8.5 0 1121 11.5z" />
        </svg>
        <Badge n={unreadRooms} label={t("unreadCount", { count: unreadRooms })} />
      </button>
      <Link
        href="/my-goodtribes"
        className="relative shrink-0 p-1 text-dark-slate/60 transition-colors hover:text-dark-slate"
        aria-label={t("myPageAria")}
        title={t("myPageAria")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true">
          <path d="M3 10.5L12 3l9 7.5" />
          <path d="M5 9v11h14V9" />
          <path d="M10 20v-6h4v6" />
        </svg>
        <Badge n={newCount} label={t("newCount", { count: newCount })} />
      </Link>
    </>
  );
}

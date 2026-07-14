"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const t = useTranslations("Notifications");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = () => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (Array.isArray(data)) setNotifications(data as Notification[]); })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    startTransition(async () => {
      await fetch("/api/notifications/mark-read", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((v) => !v); if (!open && unread > 0) markAllRead(); }}
        className="relative p-1 text-dark-slate/60 hover:text-dark-slate transition-colors"
        aria-label={t("ariaLabel")}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-coral text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-4 right-4 top-16 md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-80 bg-white border border-muted-teal rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-muted-teal/40">
            <span className="text-sm font-semibold">{t("title")}</span>
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs text-seagrass hover:underline">
              {t("viewAll")}
            </Link>
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-sm text-dark-slate/50 text-center">{t("empty")}</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-muted-teal/30">
              {notifications.slice(0, 8).map((n) => (
                <li key={n.id}>
                  {n.url ? (
                    <Link href={n.url} onClick={() => setOpen(false)} className={`flex gap-2 px-4 py-3 hover:bg-dry-sage/20 transition-colors ${!n.read ? "bg-seagrass/5" : ""}`}>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-seagrass mt-1.5 flex-shrink-0" />}
                      <div className={!n.read ? "" : "ml-3.5"}>
                        <p className="text-sm text-dark-slate leading-snug">{n.title}</p>
                        {n.body && <p className="text-xs text-dark-slate/50 mt-0.5 truncate">{n.body}</p>}
                      </div>
                    </Link>
                  ) : (
                    <div className={`flex gap-2 px-4 py-3 ${!n.read ? "bg-seagrass/5" : ""}`}>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-seagrass mt-1.5 flex-shrink-0" />}
                      <div className={!n.read ? "" : "ml-3.5"}>
                        <p className="text-sm text-dark-slate leading-snug">{n.title}</p>
                        {n.body && <p className="text-xs text-dark-slate/50 mt-0.5 truncate">{n.body}</p>}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

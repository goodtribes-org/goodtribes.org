"use client";

// Two live sections of your page (#366): "Sedan du var här sist" — your
// notifications, which used to sit behind the bell — and "Samtal", your
// conversations, which open in the conversation panel without leaving the page.

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { openConversations } from "@/components/ConversationsPanel";
import { NOTIFICATIONS_SEEN_EVENT } from "@/components/HeaderMine";
import type { ConversationItem } from "@/lib/conversations";

const SHOW = 8;

type Notification = { id: string; title: string; body: string | null; url: string | null; read: boolean; createdAt: string };

function Shell({ title, link, children }: { title: string; link?: { href?: string; onClick?: () => void; label: string }; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-[24px] border border-[#E4E4DF] bg-white p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-lg font-bold text-dark-slate">{title}</h2>
        {link?.href && <Link href={link.href} className="shrink-0 text-xs font-semibold text-[#C2410C] hover:underline">{link.label}</Link>}
        {link?.onClick && <button type="button" onClick={link.onClick} className="shrink-0 text-xs font-semibold text-[#C2410C] hover:underline">{link.label}</button>}
      </div>
      {children}
    </section>
  );
}

export function SinceLastVisit() {
  const t = useTranslations("MyGoodTribes");
  const locale = useLocale();
  const [items, setItems] = useState<Notification[] | null>(null);
  const fmt = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short" });

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Notification[]) => {
        setItems(Array.isArray(d) ? d.slice(0, SHOW) : []);
        // Seen here = read: the ⌂ badge clears. They stay highlighted on this
        // visit so you can still tell which ones were new.
        if (Array.isArray(d) && d.some((n) => !n.read)) {
          fetch("/api/notifications/mark-read", { method: "POST" })
            .then(() => window.dispatchEvent(new Event(NOTIFICATIONS_SEEN_EVENT)))
            .catch(() => {});
        }
      })
      .catch(() => setItems([]));
  }, []);

  return (
    <Shell title={t("sinceLastTitle")} link={{ href: "/notifications", label: t("allNotifications") }}>
      {!items ? (
        <p className="m-0 text-sm text-dark-slate/60">{t("loading")}</p>
      ) : items.length === 0 ? (
        <p className="m-0 text-sm text-dark-slate/60">{t("sinceLastEmpty")}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {items.map((n) => {
            const inner = (
              <>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-[#D6D6D0]" : "bg-[#E8531F]"}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm text-dark-slate ${n.read ? "" : "font-semibold"}`}>{n.title}</span>
                  {n.body && <span className="block truncate text-xs text-dark-slate/60">{n.body}</span>}
                </span>
                <span className="shrink-0 text-xs text-dark-slate/50">{fmt.format(new Date(n.createdAt))}</span>
              </>
            );
            return (
              <li key={n.id}>
                {n.url ? (
                  <Link href={n.url} className="flex items-start gap-2.5 rounded-xl px-2 py-1.5 hover:bg-[#F6F6F3]">{inner}</Link>
                ) : (
                  <div className="flex items-start gap-2.5 px-2 py-1.5">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}

export function Conversations() {
  const t = useTranslations("MyGoodTribes");
  const [items, setItems] = useState<ConversationItem[] | null>(null);

  useEffect(() => {
    fetch("/api/me/conversations")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems((d.items ?? []).slice(0, 6)))
      .catch(() => setItems([]));
  }, []);

  return (
    <Shell title={t("conversationsTitle")} link={{ onClick: () => openConversations(), label: t("allConversations") }}>
      {!items ? (
        <p className="m-0 text-sm text-dark-slate/60">{t("loading")}</p>
      ) : items.length === 0 ? (
        <p className="m-0 text-sm text-dark-slate/60">{t("conversationsEmpty")}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {items.map((c) => (
            <li key={c.roomId}>
              <button
                type="button"
                onClick={() => {
                  openConversations(c.roomId);
                  setItems((prev) => prev?.map((i) => (i.roomId === c.roomId ? { ...i, unread: false } : i)) ?? prev);
                }}
                className={`flex w-full items-start gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-[#F6F6F3] ${c.unread ? "bg-[#FDEEE7]/60" : ""}`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${c.unread ? "bg-[#E8531F]" : "bg-[#D6D6D0]"}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className={`truncate text-sm text-dark-slate ${c.unread ? "font-bold" : "font-semibold"}`}>{c.title}</span>
                    {c.context && <span className="truncate text-xs text-dark-slate/50">{c.context}</span>}
                  </span>
                  {c.preview && <span className="block truncate text-xs text-dark-slate/60">{c.preview}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

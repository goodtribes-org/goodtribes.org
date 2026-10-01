"use client";

// The personal bar along the bottom of every page for logged-in members (like
// Basecamp's My Tasks / My Events / …): Att göra · Kalender · Följer ·
// Aktivitet · Tack & kudos. Each opens a small panel above the bar with a
// quick list (from /api/me/panel) and a link to the full tab in Mitt
// GoodTribes — a quick look without leaving the page. On a phone it's a
// regular bottom tab bar.

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { PanelItem } from "@/app/api/me/panel/route";

const ITEMS = [
  { key: "todo", tab: "tasks", icon: <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /> },
  { key: "calendar", tab: "calendar", icon: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></> },
  { key: "following", tab: "following", icon: <path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" /> },
  { key: "activity", tab: "activity", icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2" /> },
  { key: "kudos", tab: "kudos", icon: <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z" /> },
] as const;
type Key = (typeof ITEMS)[number]["key"];

export default function PersonalBar() {
  const t = useTranslations("PersonalBar");
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState<Key | null>(null);
  const [items, setItems] = useState<Partial<Record<Key, PanelItem[]>>>({});
  const [todoCount, setTodoCount] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  // The count, refreshed on navigation (a task done elsewhere drops off).
  useEffect(() => {
    fetch("/api/me/panel?panel=counts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setTodoCount(d.todo))
      .catch(() => {});
  }, [pathname]);

  // Close the panel when the page changes.
  useEffect(() => setOpen(null), [pathname]);

  const load = useCallback(
    (key: Key) => {
      fetch(`/api/me/panel?panel=${key}&locale=${locale}`)
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => setItems((prev) => ({ ...prev, [key]: d.items ?? [] })))
        .catch(() => setItems((prev) => ({ ...prev, [key]: [] })));
    },
    [locale],
  );

  useEffect(() => {
    if (!open) return;
    load(open);
    function onDown(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, load]);

  const current = ITEMS.find((i) => i.key === open);
  const list = open ? items[open] : undefined;

  return (
    <>
      {/* Room at the end of the page, so the bar never covers the footer */}
      <div aria-hidden="true" className="h-14" />
      <div ref={barRef} className="fixed inset-x-0 bottom-0 z-40" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {current && (
          <div role="dialog" aria-label={t(`${current.key}.label`)} className="mx-auto mb-2 w-[calc(100%-1rem)] max-w-md overflow-hidden rounded-2xl border border-[#E4E4DF] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E4E4DF] px-4 py-3">
              <p className="m-0 text-sm font-semibold text-dark-slate">{t(`${current.key}.label`)}</p>
              <button type="button" onClick={() => setOpen(null)} aria-label={t("close")} className="text-lg leading-none text-dark-slate/50 hover:text-dark-slate">×</button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto px-2 py-2">
              {!list ? (
                <p className="m-0 px-2 py-3 text-sm text-dark-slate/60">{t("loading")}</p>
              ) : list.length === 0 ? (
                <p className="m-0 px-2 py-3 text-sm text-dark-slate/60">{t(`${current.key}.empty`)}</p>
              ) : (
                <ul className="m-0 flex list-none flex-col p-0">
                  {list.map((i) => (
                    <li key={i.id}>
                      <Link href={i.href} onClick={() => setOpen(null)} className="block rounded-xl px-2 py-2 hover:bg-[#F6F6F3]">
                        <span className="block text-sm font-medium leading-snug text-dark-slate">{i.title}</span>
                        {i.meta && <span className="block text-xs text-dark-slate/60">{i.meta}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Link
              href={`/my-goodtribes?tab=${current.tab}`}
              onClick={() => setOpen(null)}
              className="block border-t border-[#E4E4DF] bg-[#FBFBF9] px-4 py-2.5 text-center text-sm font-semibold text-[#C2410C] hover:underline"
            >
              {t("showAll")}
            </Link>
          </div>
        )}
        <nav aria-label={t("aria")} className="border-t border-[#E2E2E0] bg-[#FBFBF9]/95 backdrop-blur">
          <ul className="mx-auto flex max-w-3xl list-none justify-around gap-1 p-0 sm:justify-center sm:gap-2">
            {ITEMS.map((i) => (
              <li key={i.key}>
                <button
                  type="button"
                  onClick={() => setOpen((o) => (o === i.key ? null : i.key))}
                  aria-expanded={open === i.key}
                  className={`relative flex flex-col items-center gap-0.5 px-2 py-2 text-[11px] sm:flex-row sm:gap-1.5 sm:px-3 sm:py-3 sm:text-sm ${open === i.key ? "font-semibold text-dark-slate" : "text-dark-slate/70 hover:text-dark-slate"}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] sm:h-4 sm:w-4" aria-hidden="true">
                    {i.icon}
                  </svg>
                  {t(`${i.key}.label`)}
                  {i.key === "todo" && todoCount > 0 && (
                    <span className="absolute right-0 top-1 rounded-full bg-[#E8531F] px-1.5 text-[10px] font-bold leading-4 text-white sm:static" aria-label={t("todoCount", { count: todoCount })}>
                      {todoCount}
                    </span>
                  )}
                  {open === i.key && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-[#E8531F]" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}

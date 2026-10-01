"use client";

// The personal bar along the bottom of every page for logged-in members — what
// you need to get things done: Att göra (the ranked to-do list) · Mina projekt
// (your projects and their pulse, most active first) · Kalender. Each opens a
// small panel above the bar with a quick list (from /api/me/panel) and a link
// to Mitt GoodTribes — a quick look without leaving the page. On a phone it's
// a regular bottom tab bar. Following, your own activity and thanks live in
// Mitt GoodTribes only: they're not things you act on (thanks also notify).

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { PanelItem, PanelPulse } from "@/app/api/me/panel/route";

const ITEMS = [
  { key: "todo", tab: "tasks", icon: <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /> },
  { key: "projects", tab: "overview", icon: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></> },
  { key: "calendar", tab: "calendar", icon: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></> },
] as const;
type Key = (typeof ITEMS)[number]["key"];

const STATUS_STYLE: Record<PanelPulse["status"], { dot: string; bg: string; fg: string }> = {
  moving: { dot: "#2F9E5B", bg: "#D8F2E7", fg: "#0F5B40" },
  slowing: { dot: "#D99A06", bg: "#FCEFC7", fg: "#6B4510" },
  still: { dot: "#9AA09C", bg: "#EFEFEC", fg: "#4A514D" },
};

export default function PersonalBar() {
  const t = useTranslations("PersonalBar");
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState<Key | null>(null);
  const [items, setItems] = useState<Partial<Record<Key, PanelItem[]>>>({});
  const [counts, setCounts] = useState({ todo: 0, moving: 0 });
  const barRef = useRef<HTMLDivElement>(null);

  // The badges, refreshed on navigation (a task done elsewhere drops off).
  useEffect(() => {
    fetch("/api/me/panel?panel=counts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCounts({ todo: d.todo ?? 0, moving: d.moving ?? 0 }))
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
  const maxWeek = Math.max(1, ...(items.projects ?? []).flatMap((i) => i.pulse?.weeks ?? []));

  return (
    <>
      {/* Room at the end of the page, so the bar never covers the footer */}
      <div aria-hidden="true" className="h-14" />
      <div ref={barRef} className="fixed inset-x-0 bottom-0 z-40" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {current && (
          <div role="dialog" aria-label={t(`${current.key}.label`)} className="mx-auto mb-2 w-[calc(100%-1rem)] max-w-lg overflow-hidden rounded-2xl border border-[#E4E4DF] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E4E4DF] px-4 py-3">
              <p className="m-0 text-sm font-semibold text-dark-slate">
                {t(`${current.key}.label`)}
                {current.key === "projects" && list && list.length > 0 && (
                  <span className="ml-2 font-normal text-dark-slate/60">
                    {t("projectsMoving", { moving: list.filter((i) => i.pulse?.status === "moving").length, total: list.length })}
                  </span>
                )}
              </p>
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
                      <Link href={i.href} onClick={() => setOpen(null)} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#F6F6F3]">
                        {i.pulse ? <PulseThumb pulse={i.pulse} /> : i.icon && <span className="w-5 shrink-0 self-start text-center" aria-hidden="true">{i.icon}</span>}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className={`text-sm font-medium leading-snug text-dark-slate ${i.pulse ? "truncate font-semibold group-hover:underline" : ""}`}>{i.title}</span>
                            {i.pulse && <StatusPill pulse={i.pulse} />}
                          </span>
                          {i.meta && <span className={`block text-xs ${i.pulse ? "truncate" : ""} ${i.urgent ? "font-semibold text-[#B42318]" : "text-dark-slate/60"}`}>{i.meta}</span>}
                        </span>
                        {i.pulse && <WeekBars pulse={i.pulse} max={maxWeek} label={t("weeklyAria", { counts: i.pulse.weeks.join(", ") })} />}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Link
              href={current.tab === "overview" ? "/my-goodtribes" : `/my-goodtribes?tab=${current.tab}`}
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
                  className={`relative flex flex-col items-center gap-0.5 px-4 py-2 text-[11px] sm:flex-row sm:gap-1.5 sm:px-3 sm:py-3 sm:text-sm ${open === i.key ? "font-semibold text-dark-slate" : "text-dark-slate/70 hover:text-dark-slate"}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] sm:h-4 sm:w-4" aria-hidden="true">
                    {i.icon}
                  </svg>
                  {t(`${i.key}.label`)}
                  {i.key === "todo" && counts.todo > 0 && (
                    <span className="absolute right-0 top-1 rounded-full bg-[#E8531F] px-1.5 text-[10px] font-bold leading-4 text-white sm:static" aria-label={t("todoCount", { count: counts.todo })}>
                      {counts.todo}
                    </span>
                  )}
                  {/* Something's moving in your projects */}
                  {i.key === "projects" && counts.moving > 0 && (
                    <span className="absolute right-3 top-1.5 h-2 w-2 rounded-full bg-[#2F9E5B] sm:static" aria-label={t("projectsMovingAria", { count: counts.moving })} />
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

function PulseThumb({ pulse }: { pulse: PanelPulse }) {
  return pulse.image ? (
    <img src={pulse.image} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
  ) : (
    <span className="h-8 w-8 shrink-0 rounded-lg" style={{ background: `color-mix(in oklab, ${pulse.color} 25%, white)` }} aria-hidden="true" />
  );
}

function StatusPill({ pulse }: { pulse: PanelPulse }) {
  const st = STATUS_STYLE[pulse.status];
  return (
    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: st.bg, color: st.fg }}>
      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: st.dot }} />
      {pulse.statusLabel}
    </span>
  );
}

// Activity per week over the last weeks, oldest first, scaled to the busiest
// week across all your projects.
function WeekBars({ pulse, max, label }: { pulse: PanelPulse; max: number; label: string }) {
  const dot = STATUS_STYLE[pulse.status].dot;
  return (
    <span className="flex h-6 shrink-0 items-end gap-0.5" role="img" aria-label={label}>
      {pulse.weeks.map((n, i) => (
        <span
          key={i}
          className="w-2 rounded-sm"
          style={{ height: `${Math.max(12, (n / max) * 100)}%`, background: n === 0 ? "#E4E4DF" : dot, opacity: n === 0 ? 1 : 0.45 + (0.55 * (i + 1)) / pulse.weeks.length }}
        />
      ))}
    </span>
  );
}

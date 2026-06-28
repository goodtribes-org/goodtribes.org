"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";

const PRIMARY_TABS = [
  { label: "Projekt",       href: "" },
  { label: "Uppdateringar", href: "/updates" },
  { label: "Resurser",      href: "/wiki" },
  { label: "Bidrag",        href: "/funding" },
  { label: "Forum",         href: "/forum" },
  { label: "Kalender",      href: "/calendar" },
];

const MORE_TABS = [
  { label: "Arbete",        href: "/kanban" },
  { label: "Todo",          href: "/todos" },
  { label: "Milstolpar",    href: "/milestones" },
  { label: "Chatt",         href: "/chat" },
  { label: "Omröstningar",  href: "/polls" },
  { label: "Tokens",        href: "/tokens" },
  { label: "Impact",        href: "/impact" },
  { label: "AI Granskning", href: "/ai-review" },
  { label: "Alumni",        href: "/alumni" },
  { label: "Skalning",      href: "/scale" },
];

export default function ProjectTabNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/projects/${slug}`;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isMoreActive = MORE_TABS.some((tab) => {
    const href = `${base}${tab.href}`;
    return pathname === href || pathname.startsWith(`${href}/`);
  });

  return (
    <div className="flex flex-wrap gap-x-1 gap-y-0">
      {PRIMARY_TABS.map((tab) => {
        const href = `${base}${tab.href}`;
        const isActive =
          tab.href === ""
            ? pathname === base
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.href}
            href={href}
            className={`px-4 pb-2.5 pt-1 text-sm font-bold border-b-2 whitespace-nowrap transition-colors -mb-px ${
              isActive
                ? "border-coral text-dark-slate"
                : "border-transparent text-dark-slate/50 hover:text-dark-slate hover:border-muted-teal/40"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}

      {/* Mer ▾ dropdown */}
      <div className="relative -mb-px" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`px-4 pb-2.5 pt-1 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
            isMoreActive
              ? "border-coral text-dark-slate"
              : "border-transparent text-dark-slate/50 hover:text-dark-slate hover:border-muted-teal/40"
          }`}
        >
          Mer ▾
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-muted-teal/30 rounded-xl shadow-lg z-50 py-1 min-w-[160px]">
            {MORE_TABS.map((tab) => {
              const href = `${base}${tab.href}`;
              const isActive =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={tab.href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? "text-coral font-medium bg-coral/5"
                      : "text-dark-slate/70 hover:text-dark-slate hover:bg-muted-teal/10"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

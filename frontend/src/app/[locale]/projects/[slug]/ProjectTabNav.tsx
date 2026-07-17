"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const MAIN_TABS = [
  { label: "Projektet",     href: "" },
  { label: "Uppgifter",     href: "/tasks" },
  { label: "Kalender",      href: "/calendar" },
  { label: "Kommunikation", href: "/kanaler", absolute: true },
];

const TOOLS_TABS = [
  { label: "Omröstningar",  href: "/polls" },
  { label: "Uppdateringar", href: "/updates" },
  { label: "Lean Canvas",   href: "/lean-canvas" },
  { label: "Resurser",      href: "/wiki" },
  { label: "Filer",         href: "/files" },
  { label: "Bidrag",        href: "/funding" },
  { label: "Tokens",        href: "/tokens" },
  { label: "Impact",        href: "/impact" },
  { label: "AI Granskning", href: "/ai-review" },
  { label: "Alumni",        href: "/alumni" },
  { label: "Skalning",      href: "/scale" },
];

const ADMIN_TABS = [
  { label: "Redigera",  href: "/edit" },
  { label: "Medlemmar", href: "/members" },
];

function tabClass(active: boolean) {
  return `flex items-center gap-1 px-3 sm:px-4 pb-2.5 pt-1 text-sm font-bold whitespace-nowrap transition-colors -mb-px ${
    active
      ? "border-b-4 border-coral text-dark-slate"
      : "border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate hover:border-muted-teal/40"
  }`;
}

function TabDropdown({
  label,
  tabs,
  base,
  active,
  isActive,
}: {
  label: string;
  tabs: { label: string; href: string }[];
  base: string;
  active: boolean;
  isActive: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right) });
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button ref={btnRef} onClick={toggle} className={tabClass(active)}>
        {label}
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="fixed w-48 max-w-[calc(100vw-1rem)] bg-white border border-muted-teal/20 rounded-lg shadow-lg z-50 py-1"
          style={{ top: pos.top, right: pos.right }}
        >
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={`${base}${tab.href}`}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2 text-sm transition-colors ${
                isActive(tab.href)
                  ? "text-dark-slate font-bold bg-coral/5"
                  : "text-dark-slate/60 hover:text-dark-slate hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

export default function ProjectTabNav({ slug, isOwner }: { slug: string; isOwner?: boolean }) {
  const pathname = usePathname();
  const base = `/projects/${slug}`;

  function isActive(href: string) {
    if (href === "/kanaler") return pathname.startsWith("/messages");
    const full = `${base}${href}`;
    return href === ""
      ? pathname === base
      : pathname === full || pathname.startsWith(`${full}/`);
  }

  const toolsActive = TOOLS_TABS.some((t) => isActive(t.href));
  const adminActive = ADMIN_TABS.some((t) => isActive(t.href));

  return (
    <div
      className="flex flex-nowrap items-center overflow-x-auto justify-center gap-x-0.5 scrollbar-none w-full"
      style={{ scrollbarWidth: "none" }}
    >
      {MAIN_TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.absolute ? `/messages?project=${slug}` : `${base}${tab.href}`}
          className={tabClass(isActive(tab.href))}
        >
          {tab.label}
        </Link>
      ))}

      <TabDropdown label="Verktyg" tabs={TOOLS_TABS} base={base} active={toolsActive} isActive={isActive} />

      {isOwner && (
        <TabDropdown label="Admin" tabs={ADMIN_TABS} base={base} active={adminActive} isActive={isActive} />
      )}
    </div>
  );
}

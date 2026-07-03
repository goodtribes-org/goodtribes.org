"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const MAIN_TABS = [
  { label: "Projekt",      href: "" },
  { label: "Uppgifter",    href: "/tasks" },
  { label: "Planering",    href: "/calendar" },
  { label: "Kanaler",      href: "/kanaler" },
  { label: "Omröstningar", href: "/polls" },
];

const MENU_TABS = [
  { label: "Uppdateringar", href: "/updates" },
  { label: "Resurser",      href: "/wiki" },
  { label: "Bidrag",        href: "/funding" },
  { label: "Tokens",        href: "/tokens" },
  { label: "Impact",        href: "/impact" },
  { label: "AI Granskning", href: "/ai-review" },
  { label: "Alumni",        href: "/alumni" },
  { label: "Skalning",      href: "/scale" },
];

const ADMIN_TABS = [
  { label: "Redigera",   href: "/edit" },
  { label: "Medlemmar",  href: "/members" },
];

export default function ProjectTabNav({ slug, isOwner }: { slug: string; isOwner?: boolean }) {
  const pathname = usePathname();
  const base = `/projects/${slug}`;
  const [open, setOpen] = useState(false);
  const [openAdmin, setOpenAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const adminRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (adminRef.current && !adminRef.current.contains(e.target as Node)) {
        setOpenAdmin(false);
      }
    }
    if (open || openAdmin) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, openAdmin]);

  function isActive(href: string) {
    const full = `${base}${href}`;
    return href === ""
      ? pathname === base
      : pathname === full || pathname.startsWith(`${full}/`);
  }

  const menuActive = MENU_TABS.some((t) => isActive(t.href));

  return (
    <div className="flex items-center">
      {/* Scrollable main tabs */}
      <div
        className="flex flex-nowrap overflow-x-auto justify-center gap-x-1 scrollbar-none flex-1 min-w-0"
        style={{ scrollbarWidth: "none" }}
      >
        {MAIN_TABS.map((tab) => (
          <Link
            key={tab.href}
            href={`${base}${tab.href}`}
            className={`px-4 pb-2.5 pt-1 text-sm font-bold whitespace-nowrap transition-colors -mb-px ${
              isActive(tab.href)
                ? "border-b-4 border-coral text-dark-slate"
                : "border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate hover:border-muted-teal/40"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Dropdown — outside scroll container so it isn't clipped */}
      <div ref={menuRef} className="relative shrink-0">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-1 px-4 pb-2.5 pt-1 text-sm font-bold whitespace-nowrap transition-colors -mb-px ${
            menuActive
              ? "border-b-4 border-coral text-dark-slate"
              : "border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate hover:border-muted-teal/40"
          }`}
        >
          Mer
          <svg
            className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-muted-teal/20 rounded-lg shadow-lg z-50 py-1">
            {MENU_TABS.map((tab) => (
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
          </div>
        )}
      </div>

      {/* Admin dropdown — only for owners/admins */}
      {isOwner && (
        <div ref={adminRef} className="relative shrink-0">
          <button
            onClick={() => setOpenAdmin((v) => !v)}
            className={`flex items-center gap-1 px-4 pb-2.5 pt-1 text-sm font-bold whitespace-nowrap transition-colors -mb-px ${
              ADMIN_TABS.some((t) => isActive(t.href))
                ? "border-b-4 border-coral text-dark-slate"
                : "border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate hover:border-muted-teal/40"
            }`}
          >
            Admin
            <svg
              className={`w-3.5 h-3.5 transition-transform ${openAdmin ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openAdmin && (
            <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-muted-teal/20 rounded-lg shadow-lg z-50 py-1">
              {ADMIN_TABS.map((tab) => (
                <Link
                  key={tab.href}
                  href={`${base}${tab.href}`}
                  onClick={() => setOpenAdmin(false)}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    isActive(tab.href)
                      ? "text-dark-slate font-bold bg-coral/5"
                      : "text-dark-slate/60 hover:text-dark-slate hover:bg-gray-50"
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

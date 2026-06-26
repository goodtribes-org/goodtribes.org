"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Story",        href: "" },
  { label: "Todo",         href: "/todos" },
  { label: "Kanban",       href: "/kanban" },
  { label: "Milestones",   href: "/milestones" },
  { label: "Wiki",         href: "/wiki" },
  { label: "Updates",      href: "/updates" },
  { label: "Chat",         href: "/chat" },
  { label: "Funding",      href: "/funding" },
  { label: "Activity",     href: "/activity" },
  { label: "Forum",        href: "/forum" },
  { label: "Omröstningar", href: "/polls" },
  { label: "Kalender",     href: "/calendar" },
  { label: "Tokens",       href: "/tokens" },
  { label: "Impact",       href: "/impact" },
  { label: "AI Granskning",href: "/ai-review" },
  { label: "Alumni",       href: "/alumni" },
  { label: "Skalning",     href: "/scale" },
];

export default function ProjectTabNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/projects/${slug}`;

  return (
    <div className="border-b border-muted-teal/40 mb-6">
      <div className="flex gap-6 overflow-x-auto">
        {TABS.map((tab) => {
          const href = `${base}${tab.href}`;
          const isActive = tab.href === ""
            ? pathname === base
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={tab.href}
              href={href}
              className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? "border-coral text-coral"
                  : "border-transparent text-dark-slate/50 hover:text-dark-slate"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ALL_TABS = [
  { label: "Projekt",       href: "" },
  { label: "Uppdateringar", href: "/updates" },
  { label: "Resurser",      href: "/wiki" },
  { label: "Bidrag",        href: "/funding" },
  { label: "Forum",         href: "/forum" },
  { label: "Kalender",      href: "/calendar" },
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

  return (
    <div className="flex flex-wrap gap-x-1 gap-y-0">
      {ALL_TABS.map((tab) => {
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
    </div>
  );
}

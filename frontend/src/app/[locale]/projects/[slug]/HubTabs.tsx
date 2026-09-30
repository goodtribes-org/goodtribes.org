"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { hubForPath, visibleTabs } from "@/lib/projectSimpleNav";

// PROTOTYPE: tabs at the top of every page that belongs to one of the
// merged menu entries (Att göra · Kalender · Färdplan, Wiki · Filer ·
// Uppdateringar, …), so seven menu rows still reach all the old tools.
export default function HubTabs({ slug, isCommercial }: { slug: string; isCommercial?: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("ProjectSideNav");
  const base = `/projects/${slug}`;
  const hub = hubForPath(pathname, base);
  if (!hub) return null;
  return (
    <div className="mx-auto mt-4 flex max-w-6xl flex-wrap items-center gap-1 border-b border-muted-teal/30" role="tablist" aria-label={hub.label}>
      <span className="mr-2 text-xs font-semibold uppercase tracking-widest text-dark-slate/40">{hub.label}</span>
      {visibleTabs(hub, isCommercial).map((tab) => {
        const href = `${base}${tab.href}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.key}
            href={href}
            role="tab"
            aria-selected={active}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${active ? "border-coral font-semibold text-dark-slate" : "border-transparent text-dark-slate/60 hover:text-dark-slate"}`}
          >
            {t(tab.labelKey as Parameters<typeof t>[0])}
          </Link>
        );
      })}
    </div>
  );
}

"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Home, Lock, MessageCircle, type LucideIcon } from "lucide-react";
import type { ProjectPhaseValue } from "@/lib/projectPhase";
import { buildProjectNavGroups, type Group, type NavItem } from "./ProjectTopNav";

// Groups that start folded, so the rail doesn't open as a ~35-row list.
const INITIALLY_CLOSED = new Set(["community", "admin"]);

/**
 * Vertical project menu to the left of the content on the project home.
 * Same groups and items as the header tabs (buildProjectNavGroups), shown
 * as a rail on wide screens; narrower screens rely on the header tabs.
 */
export default function ProjectSideNav({
  slug,
  isOwner,
  isCommercial,
  phase,
  completedChecklistKeys,
}: {
  slug: string;
  isOwner?: boolean;
  isCommercial?: boolean;
  phase?: ProjectPhaseValue;
  completedChecklistKeys?: string[];
}) {
  const pathname = usePathname();
  const t = useTranslations("ProjectSideNav");
  const base = `/projects/${slug}`;
  const groups = buildProjectNavGroups(t, { phase, completedChecklistKeys, isOwner, isCommercial });
  const [closed, setClosed] = useState<Set<string>>(() => new Set(INITIALLY_CLOSED));

  function isActive(href: string) {
    if (href === "/kanaler") return pathname.startsWith("/messages");
    if (href === "/fork/new") return pathname.startsWith("/fork");
    const full = `${base}${href}`;
    return href === "" ? pathname === base : pathname === full || pathname.startsWith(`${full}/`);
  }
  function hrefFor(item: NavItem) {
    return item.getHref ? item.getHref(slug) : `${base}${item.href}`;
  }
  function toggle(key: string) {
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const rowClass = (active: boolean) =>
    `flex items-center gap-3 rounded-lg py-1.5 mx-2 pl-3 pr-2 text-sm border-l-4 transition-colors ${
      active
        ? "border-coral bg-coral/10 text-dark-slate font-bold"
        : "border-transparent text-dark-slate/60 hover:bg-white hover:text-dark-slate"
    }`;

  function row(label: string, href: string, icon: LucideIcon, active: boolean) {
    const Icon = icon;
    return (
      <Link key={href} href={href} className={rowClass(active)} aria-current={active ? "page" : undefined}>
        <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  function subheading(text: string) {
    return (
      <p className="px-5 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-dark-slate/40">{text}</p>
    );
  }

  function renderGroup(group: Group) {
    const Icon = group.icon;
    const open = !closed.has(group.key);
    return (
      <div key={group.key} className="pt-2">
        <button
          type="button"
          onClick={() => toggle(group.key)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 py-1.5 px-5 text-xs font-semibold uppercase tracking-widest text-dark-slate/50 hover:text-dark-slate"
        >
          <span className="flex items-center gap-2">
            <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            {group.label}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="space-y-0.5 mt-0.5">
            {group.items.map((item) => row(item.label, hrefFor(item), item.icon, isActive(item.href)))}
            {group.early && group.early.length > 0 && (
              <>
                {subheading(t("earlyToolsGroupLabel"))}
                {group.early.map((item) => row(item.label, hrefFor(item), item.icon, isActive(item.href)))}
              </>
            )}
            {group.locked && group.locked.length > 0 && (
              <>
                {subheading(t("lockedHint"))}
                {group.locked.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <div
                      key={item.href}
                      aria-disabled="true"
                      className="flex items-center gap-3 rounded-lg py-1.5 mx-2 pl-3 pr-2 text-sm border-l-4 border-transparent text-dark-slate/30 cursor-not-allowed"
                    >
                      <ItemIcon className="w-4 h-4 shrink-0" strokeWidth={2} />
                      <span className="flex-1 truncate">{item.label}</span>
                      <Lock className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <nav aria-label={t("navGroupsLabel")} className="hidden lg:block relative shrink-0 w-56">
      {/* The rail spans the full hero height, but its fill starts where the
          hero's background image ends, so the items line up with the content. */}
      <div
        className="absolute left-0 right-0 bottom-0 border-r border-muted-teal/20"
        style={{ top: "490px", backgroundColor: "#fbf8f4" }}
      />
      <div aria-hidden style={{ height: "490px" }} />
      <div className="sticky top-0 max-h-screen overflow-y-auto py-3" style={{ scrollbarWidth: "none" }}>
        <div className="space-y-0.5">
          {row(t("navHome"), base, Home, isActive(""))}
          {row(t("navChat"), `/messages?project=${slug}`, MessageCircle, isActive("/kanaler"))}
        </div>
        {groups.map(renderGroup)}
      </div>
    </nav>
  );
}

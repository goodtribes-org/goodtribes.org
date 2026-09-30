"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { PanelLeftClose, PanelLeftOpen, PinOff, type LucideIcon } from "lucide-react";
import { buildSimpleProjectNav } from "@/lib/projectSimpleNav";
import { setProjectMenuIconOnly, setProjectMenuPinned, useProjectMenuIconOnly, useProjectMenuPinned } from "@/lib/projectMenuStore";
import type { ProjectPhaseValue } from "@/lib/projectPhase";

/**
 * PROTOTYPE (proto/phases-top-tools-left): the pinned project menu — the
 * same seven entries as the ☰ drawer (lib/projectSimpleNav.ts), shown as a
 * rail on wide screens once pinned from the drawer. The viewer chooses full
 * labels (w-56) or icons only (w-16, label as tooltip), like the original
 * left menu.
 */
export default function ProjectSideNav({
  slug,
  isOwner,
  phase,
  topOffset = 490,
}: {
  slug: string;
  isOwner?: boolean;
  isCommercial?: boolean;
  phase?: ProjectPhaseValue;
  completedChecklistKeys?: string[];
  // Where the rail's fill starts: below the project home's hero (490px), or
  // at the top on pages without a hero (0).
  topOffset?: number;
}) {
  const pathname = usePathname();
  const t = useTranslations("ProjectSideNav");
  const tMenu = useTranslations("PhaseMenuBar");
  const tPhase = useTranslations("ProjectPhase");
  const pinned = useProjectMenuPinned();
  const iconOnly = useProjectMenuIconOnly();
  if (!pinned) return null;

  const entries = buildSimpleProjectNav(
    t as unknown as (k: string, v?: Record<string, string>) => string,
    tMenu as unknown as (k: string, v?: Record<string, string>) => string,
    (ph) => tPhase(ph as Parameters<typeof tPhase>[0]),
    { slug, phase, isOwner },
  );

  const row = (key: string, label: string, href: string, Icon: LucideIcon, active: boolean) => (
    <Link
      key={key}
      href={href}
      aria-current={active ? "page" : undefined}
      title={iconOnly ? label : undefined}
      aria-label={iconOnly ? label : undefined}
      className={`flex items-center rounded-lg py-2 mx-2 text-sm border-l-4 transition-colors ${iconOnly ? "justify-center px-0" : "gap-3 pl-3 pr-2"} ${
        active ? "border-coral bg-coral/10 text-dark-slate font-bold" : "border-transparent text-dark-slate/60 hover:bg-white hover:text-dark-slate"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
      {!iconOnly && <span className="truncate">{label}</span>}
    </Link>
  );

  const control = "flex items-center gap-1.5 rounded-lg p-1.5 text-[11px] font-medium text-dark-slate/45 hover:bg-white hover:text-dark-slate";

  return (
    <nav aria-label={t("navGroupsLabel")} className={`hidden lg:block relative shrink-0 transition-[width] ${iconOnly ? "w-16" : "w-56"}`}>
      {/* The rail spans the full hero height on the project home, but its
          fill starts where the hero's background image ends. */}
      <div className="absolute left-0 right-0 bottom-0 border-r border-muted-teal/20" style={{ top: `${topOffset}px`, backgroundColor: "#fbf8f4" }} />
      {topOffset > 0 && <div aria-hidden style={{ height: `${topOffset}px` }} />}
      <div className="sticky top-0 max-h-screen overflow-y-auto py-3" style={{ scrollbarWidth: "none" }}>
        <div className={`mb-1 flex items-center ${iconOnly ? "flex-col gap-1" : "justify-between px-3"}`}>
          <button
            type="button"
            onClick={() => setProjectMenuIconOnly(!iconOnly)}
            title={iconOnly ? "Visa hela menyn" : "Visa bara symboler"}
            aria-label={iconOnly ? "Visa hela menyn" : "Visa bara symboler"}
            className={control}
          >
            {iconOnly ? <PanelLeftOpen className="h-4 w-4" strokeWidth={2} /> : <PanelLeftClose className="h-4 w-4" strokeWidth={2} />}
            {!iconOnly && "Bara symboler"}
          </button>
          <button type="button" onClick={() => setProjectMenuPinned(false)} title="Lossa menyn" aria-label="Lossa menyn" className={control}>
            <PinOff className="h-3.5 w-3.5" strokeWidth={2} />
            {!iconOnly && "Lossa"}
          </button>
        </div>
        <div className="space-y-0.5">{entries.map((e) => row(e.key, e.label, e.href, e.icon, e.matches(pathname)))}</div>
      </div>
    </nav>
  );
}

"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import {
  ListChecks,
  Calendar,
  MessageCircle,
  Users2,
  Vote,
  Megaphone,
  Lightbulb,
  LayoutGrid,
  ClipboardList,
  BookOpen,
  Folder,
  HandCoins,
  Coins,
  Target,
  Bot,
  GraduationCap,
  TrendingUp,
  Handshake,
  Scale,
  PiggyBank,
  GitFork,
  Settings,
  Pencil,
  Users,
  ChevronDown,
  Rocket,
  Gem,
  Mic,
  Radar,
  Flag,
  Route,
  Lock,
  ClipboardCheck,
  Building2,
  Milestone,
  PartyPopper,
  ShieldCheck,
  Landmark,
  Briefcase,
  FileText,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ProjectPhaseValue } from "@/lib/projectPhase";
import { groupNavItemsByPhase } from "@/lib/navPhaseGrouping";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  getHref?: (slug: string) => string;
  commercialOnly?: boolean;
  phase?: ProjectPhaseValue;
};

type T = ReturnType<typeof useTranslations>;

// Grouping: at most 6 top-level tabs (Arbete, Chatt, Dokument,
// Fasverktyg, Gemenskap, Admin), replacing the ~35-row vertical side rail.
// The project home is reached via the project name next to the logo.
function workItems(t: T): NavItem[] {
  return [
    { label: t("navTasks"), href: "/tasks", icon: ListChecks },
    { label: t("navCalendar"), href: "/calendar", icon: Calendar },
    { label: t("navRoadmap"), href: "/roadmap", icon: Route },
  ];
}

function docItems(t: T): NavItem[] {
  return [
    { label: t("navWiki"), href: "/wiki", icon: BookOpen },
    { label: t("navFiles"), href: "/files", icon: Folder },
    { label: t("navBlog"), href: "/updates", icon: Megaphone },
  ];
}

function phaseItems(t: T): NavItem[] {
  return [
    { label: t("navIdeaWorkshop"), href: "/idea-sessions", icon: Lightbulb, phase: "IDEA" },
    { label: t("navLeanCanvas"), href: "/lean-canvas", icon: LayoutGrid, phase: "IDEA" },
    { label: t("navValueProposition"), href: "/value-proposition", icon: Gem, phase: "IDEA" },
    { label: t("navInterviews"), href: "/interviews", icon: Mic, phase: "IDEA" },
    { label: t("navMarketScan"), href: "/market-scan", icon: Radar, phase: "IDEA" },
    { label: t("navProjectPlan"), href: "/project-plan", icon: ClipboardList, phase: "PILOT" },
    { label: t("navDesignSprints"), href: "/sprints", icon: Rocket, phase: "PILOT" },
    { label: t("navPilotEvaluation"), href: "/pilot-evaluation", icon: ClipboardCheck, phase: "PRODUCTION" },
    { label: t("navLaunchPlan"), href: "/launch-plan", icon: Flag, phase: "PRODUCTION" },
    { label: t("navEstablishmentPlan"), href: "/establishment-plan", icon: Building2, phase: "ESTABLISH" },
    { label: t("navReviewRequest"), href: "/review-request", icon: ShieldCheck, phase: "ESTABLISH" },
    { label: t("navScalingPlan"), href: "/scaling-plan", icon: Milestone, phase: "SCALE" },
    { label: t("navImpactFollowup"), href: "/impact-followup", icon: PartyPopper, phase: "IMPACT" },
  ];
}

function communityItems(t: T): NavItem[] {
  return [
    { label: t("navPolls"), href: "/polls", icon: Vote },
    { label: t("navFunding"), href: "/funding", icon: HandCoins },
    { label: t("navFundingApplications"), href: "/funding-applications", icon: Landmark },
    { label: t("navTokens"), href: "/tokens", icon: Coins },
    { label: t("navProfitDistribution"), href: "/profit-distribution", icon: PiggyBank, commercialOnly: true },
  ];
}

function adminItems(t: T): NavItem[] {
  return [
    { label: t("navEdit"), href: "/edit", icon: Pencil },
    { label: t("navMembers"), href: "/members", icon: Users },
    { label: t("navAlumni"), href: "/alumni", icon: GraduationCap },
    { label: t("navImpact"), href: "/impact", icon: Target },
    { label: t("navScaling"), href: "/scale", icon: TrendingUp },
    { label: t("navPartnerships"), href: "/partnerships", icon: Handshake },
    { label: t("navAiReview"), href: "/ai-review", icon: Bot },
    { label: t("navLegalType"), href: "/legal-type", icon: Scale },
    { label: t("navFork"), href: "/fork/new", icon: GitFork, getHref: (slug) => `/fork/new?sourceId=${slug}` },
  ];
}

type Group = {
  key: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  early?: NavItem[];
  locked?: NavItem[];
};

// Empty element in the site header ([locale]/layout.tsx) the tabs portal into.
export const PROJECT_NAV_SLOT_ID = "project-nav-slot";
// Element right after the GoodTribes logo where the project name is shown
// (replacing the "GoodTribes" wordmark and Beta badge on project pages).
export const PROJECT_TITLE_SLOT_ID = "project-title-slot";

/**
 * GitHub-style project tabs on every project page, rendered inside the site
 * header (portal into its slot). Replaces the old vertical ProjectSideNav.
 */
export default function ProjectTopNav({
  slug,
  title,
  isOwner,
  isCommercial,
  phase,
  completedChecklistKeys,
}: {
  slug: string;
  title: string;
  isOwner?: boolean;
  isCommercial?: boolean;
  phase?: ProjectPhaseValue;
  completedChecklistKeys?: string[];
}) {
  const pathname = usePathname();
  const t = useTranslations("ProjectSideNav");
  const base = `/projects/${slug}`;
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => setOpenKey(null), [pathname]);

  useEffect(() => {
    if (!openKey) return;
    function close(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") setOpenKey(null);
        return;
      }
      if (!(e.target as HTMLElement).closest("[data-project-nav]")) setOpenKey(null);
    }
    function closeOnScroll() {
      setOpenKey(null);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("resize", closeOnScroll);
    const bar = document.getElementById(PROJECT_NAV_SLOT_ID);
    bar?.addEventListener("scroll", closeOnScroll);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("resize", closeOnScroll);
      bar?.removeEventListener("scroll", closeOnScroll);
    };
  }, [openKey]);

  function isActive(href: string) {
    if (href === "/kanaler") return pathname.startsWith("/messages");
    if (href === "/fork/new") return pathname.startsWith("/fork");
    const full = `${base}${href}`;
    return href === "" ? pathname === base : pathname === full || pathname.startsWith(`${full}/`);
  }
  function hrefFor(item: NavItem) {
    return item.getHref ? item.getHref(slug) : `${base}${item.href}`;
  }

  // phase is optional (e.g. /messages?project=… doesn't know it) — without it
  // every phase tool is shown as available rather than guessing a phase.
  const phased = phase
    ? groupNavItemsByPhase(phaseItems(t), phase, completedChecklistKeys ?? [])
    : { current: phaseItems(t), early: [] as NavItem[], locked: [] as NavItem[] };

  const groups: Group[] = [
    { key: "work", label: t("groupWork"), icon: Briefcase, items: workItems(t) },
    { key: "docs", label: t("groupDocs"), icon: FileText, items: docItems(t) },
    {
      key: "phase",
      label: t("groupPhaseTools"),
      icon: Wrench,
      items: phased.current,
      early: phased.early,
      locked: phased.locked,
    },
    {
      key: "community",
      label: t("toolsGroupLabel"),
      icon: Users2,
      items: communityItems(t).filter((i) => !i.commercialOnly || isCommercial),
    },
    ...(isOwner ? [{ key: "admin", label: t("adminGroupLabel"), icon: Settings, items: adminItems(t) }] : []),
  ];

  function toggle(key: string, button: HTMLButtonElement) {
    if (openKey === key) {
      setOpenKey(null);
      return;
    }
    // Menus are position:fixed (not absolute) so the header slot (which
    // scrolls horizontally on very narrow screens) can't clip them.
    const r = button.getBoundingClientRect();
    const width = 240;
    setMenuPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)), top: r.bottom + 4 });
    setOpenKey(key);
  }

  // The tabs always render inside the site header itself (slot in
  // [locale]/layout.tsx), centred between the logo and the icons. When the
  // header gets too narrow for the labels, they collapse to icons only
  // (label kept as tooltip/aria-label); if even that doesn't fit, the slot
  // scrolls horizontally. Measured rather than a fixed breakpoint, because the
  // header's right side varies (logged in or not, admin tab or not).
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const [titleSlot, setTitleSlot] = useState<HTMLElement | null>(null);
  const [compact, setCompact] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const fullWidthRef = useRef(0);
  useEffect(() => {
    setHeaderSlot(document.getElementById(PROJECT_NAV_SLOT_ID));
    setTitleSlot(document.getElementById(PROJECT_TITLE_SLOT_ID));
    // Tells the header's brand block to show the project name instead of
    // "GoodTribes BETA" (see #site-brand in [locale]/layout.tsx).
    const brand = document.getElementById("site-brand");
    brand?.setAttribute("data-project", "");
    return () => brand?.removeAttribute("data-project");
  }, []);
  useEffect(() => {
    if (!headerSlot) return;
    const measure = () => {
      const nav = navRef.current;
      if (!nav) return;
      setCompact((wasCompact) => {
        if (!wasCompact) fullWidthRef.current = nav.offsetWidth;
        return fullWidthRef.current > headerSlot.clientWidth;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(headerSlot);
    return () => ro.disconnect();
  }, [headerSlot]);

  const tabClass = (active: boolean) =>
    `flex h-full shrink-0 items-center gap-1.5 whitespace-nowrap ${compact ? "px-2.5" : "px-3"} text-sm border-b-2 -mb-px transition-colors ${
      active
        ? "border-coral text-dark-slate font-semibold"
        : "border-transparent text-dark-slate/65 hover:text-dark-slate hover:border-muted-teal/50"
    }`;

  function directTab(label: string, href: string, icon: LucideIcon, active: boolean) {
    const Icon = icon;
    return (
      <Link
        key={href}
        href={href}
        title={compact ? label : undefined}
        aria-label={compact ? label : undefined}
        className={tabClass(active)}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
        {!compact && label}
      </Link>
    );
  }

  const openGroup = groups.find((g) => g.key === openKey);

  return (
    <>
      {titleSlot &&
        createPortal(
          <Link
            href={base}
            title={title}
            className="truncate text-dark-slate font-semibold text-xl tracking-tight hover:text-seagrass transition-colors"
          >
            {title}
          </Link>,
          titleSlot,
        )}
      {headerSlot &&
        createPortal(
          <nav
            ref={navRef}
            data-project-nav
            aria-label={t("navGroupsLabel")}
            className="flex shrink-0 items-stretch h-full gap-0.5"
          >
            {groups.slice(0, 1).map((g) => renderGroupTab(g))}
            {directTab(t("navChat"), `/messages?project=${slug}`, MessageCircle, isActive("/kanaler"))}
            {groups.slice(1).map((g) => renderGroupTab(g))}
          </nav>,
          headerSlot,
        )}

      {openGroup && menuPos && createPortal(
        <div
          data-project-nav
          className="fixed z-[10001] w-60 bg-white border border-muted-teal rounded-xl shadow-lg py-1.5 text-sm"
          style={{ left: menuPos.left, top: menuPos.top }}
        >
          {openGroup.items.map((item) => (
            renderMenuRow(item)
          ))}
          {openGroup.early && openGroup.early.length > 0 && (
            <>
              <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-dark-slate/40">
                {t("earlyToolsGroupLabel")}
              </p>
              {openGroup.early.map((item) => (
                renderMenuRow(item)
              ))}
            </>
          )}
          {openGroup.locked && openGroup.locked.length > 0 && (
            <>
              <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-dark-slate/40">
                {t("lockedHint")}
              </p>
              {openGroup.locked.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.href}
                    aria-disabled="true"
                    className="flex items-center gap-2.5 px-4 py-1.5 text-dark-slate/30 cursor-not-allowed"
                  >
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
                    <span className="flex-1 truncate">{item.label}</span>
                    <Lock className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                  </div>
                );
              })}
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  );

  function renderGroupTab(group: Group) {
    const Icon = group.icon;
    const active = [...group.items, ...(group.early ?? [])].some((i) => isActive(i.href));
    const open = openKey === group.key;
    return (
      <button
        key={group.key}
        type="button"
        onClick={(e) => toggle(group.key, e.currentTarget)}
        aria-expanded={open}
        title={compact ? group.label : undefined}
        aria-label={compact ? group.label : undefined}
        className={tabClass(active)}
      >
        <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
        {!compact && group.label}
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
    );
  }

  function renderMenuRow(item: NavItem) {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={hrefFor(item)}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2.5 px-4 py-1.5 ${
          active ? "bg-coral/10 text-dark-slate font-semibold" : "text-dark-slate/70 hover:text-dark-slate hover:bg-dry-sage/20"
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  }
}

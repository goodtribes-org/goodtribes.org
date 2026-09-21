"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Home,
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
  Menu,
  Route,
  Lock,
  History,
  ClipboardCheck,
  Building2,
  Milestone,
  PartyPopper,
  ShieldCheck,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import type { ProjectPhaseValue } from "@/lib/projectPhase";
import { groupNavItemsByPhase } from "@/lib/navPhaseGrouping";

const SIDENAV_COLLAPSED_STORAGE_KEY = "projectSideNavCollapsed";

type NavItem = { label: string; href: string; icon: LucideIcon; getHref?: (slug: string) => string; commercialOnly?: boolean; phase?: ProjectPhaseValue };

function buildMainItems(t: ReturnType<typeof useTranslations>): NavItem[] {
  return [
    { label: t("navHome"), href: "",          icon: Home },
    { label: t("navTasks"),   href: "/tasks",     icon: ListChecks },
    { label: t("navCalendar"),   href: "/calendar",  icon: Calendar },
    { label: t("navRoadmap"),   href: "/roadmap",   icon: Route },
    { label: t("navChat"),       href: "/kanaler",   icon: MessageCircle, getHref: (slug) => `/messages?project=${slug}` },
    { label: t("navBlog"),      href: "/updates",   icon: Megaphone },
    { label: t("navFiles"),      href: "/files",     icon: Folder },
    { label: t("navWiki"),       href: "/wiki",      icon: BookOpen },
    { label: t("navIdeaWorkshop"), href: "/idea-sessions", icon: Lightbulb, phase: "IDEA" },
    { label: t("navLeanCanvas"), href: "/lean-canvas",   icon: LayoutGrid, phase: "IDEA" },
    { label: t("navValueProposition"), href: "/value-proposition", icon: Gem, phase: "IDEA" },
    { label: t("navInterviews"), href: "/interviews", icon: Mic, phase: "IDEA" },
    { label: t("navMarketScan"), href: "/market-scan", icon: Radar, phase: "IDEA" },
    { label: t("navProjectPlan"), href: "/project-plan", icon: ClipboardList, phase: "PILOT" },
    { label: t("navDesignSprints"), href: "/sprints",    icon: Rocket, phase: "PILOT" },
    { label: t("navPilotEvaluation"), href: "/pilot-evaluation", icon: ClipboardCheck, phase: "PRODUCTION" },
    { label: t("navLaunchPlan"), href: "/launch-plan", icon: Flag, phase: "PRODUCTION" },
    { label: t("navEstablishmentPlan"), href: "/establishment-plan", icon: Building2, phase: "ESTABLISH" },
    { label: t("navReviewRequest"), href: "/review-request", icon: ShieldCheck, phase: "ESTABLISH" },
    { label: t("navScalingPlan"), href: "/scaling-plan", icon: Milestone, phase: "SCALE" },
    { label: t("navImpactFollowup"), href: "/impact-followup", icon: PartyPopper, phase: "IMPACT" },
  ];
}

function buildToolsItems(t: ReturnType<typeof useTranslations>): NavItem[] {
  return [
    { label: t("navPolls"),    href: "/polls",              icon: Vote },
    { label: t("navFunding"),          href: "/funding",             icon: HandCoins },
    { label: t("navFundingApplications"), href: "/funding-applications", icon: Landmark },
    { label: t("navTokens"),          href: "/tokens",               icon: Coins },
    { label: t("navProfitDistribution"), href: "/profit-distribution", icon: PiggyBank, commercialOnly: true },
  ];
}

function buildAdminItems(t: ReturnType<typeof useTranslations>): NavItem[] {
  return [
    { label: t("navEdit"),      href: "/edit",                icon: Pencil },
    { label: t("navMembers"),     href: "/members",              icon: Users },
    { label: t("navAlumni"),        href: "/alumni",               icon: GraduationCap },
    { label: t("navImpact"),        href: "/impact",               icon: Target },
    { label: t("navScaling"),      href: "/scale",                icon: TrendingUp },
    { label: t("navPartnerships"),   href: "/partnerships",         icon: Handshake },
    { label: t("navAiReview"), href: "/ai-review",            icon: Bot },
    { label: t("navLegalType"), href: "/legal-type",           icon: Scale },
    { label: t("navFork"),          href: "/fork/new",             icon: GitFork, getHref: (slug) => `/fork/new?sourceId=${slug}` },
  ];
}

function Row({
  item,
  active,
  href,
  indent,
  iconOnly,
  locked,
}: {
  item: NavItem;
  active: boolean;
  href: string;
  indent?: boolean;
  iconOnly?: boolean;
  locked?: boolean;
}) {
  const Icon = item.icon;
  const className = `group flex items-center gap-3 rounded-lg py-2 mx-2 pl-2 pr-2 transition-colors border-l-4 ${
    indent && !iconOnly ? "lg:pl-6" : "lg:pl-3"
  } justify-center ${iconOnly ? "" : "lg:justify-start"} ${
    locked
      ? "border-transparent text-dark-slate/30 cursor-not-allowed"
      : active
      ? "border-coral bg-coral/10 text-dark-slate font-bold"
      : "border-transparent text-dark-slate/60 hover:bg-white hover:text-dark-slate"
  }`;
  const content = (
    <>
      <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
      <span className={`${iconOnly ? "hidden" : "hidden lg:inline"} text-sm truncate`}>{item.label}</span>
      {locked && (
        <Lock className={`${iconOnly ? "hidden" : "hidden lg:inline"} w-3.5 h-3.5 shrink-0 ml-auto`} strokeWidth={2} />
      )}
    </>
  );

  if (locked) {
    return (
      <div className={className} title={item.label} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link href={href} title={item.label} className={className}>
      {content}
    </Link>
  );
}

function GroupToggle({
  label,
  icon: Icon,
  open,
  active,
  onClick,
  iconOnly,
}: {
  label: string;
  icon: LucideIcon;
  open: boolean;
  active: boolean;
  onClick: () => void;
  iconOnly?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex items-center gap-3 rounded-lg py-2 mx-2 pl-2 lg:pl-3 pr-2 transition-colors border-l-4 justify-center ${
        iconOnly ? "" : "lg:justify-between"
      } ${
        active
          ? "border-coral bg-coral/10 text-dark-slate font-bold"
          : "border-transparent text-dark-slate/60 hover:bg-white hover:text-dark-slate"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
        <span className={`${iconOnly ? "hidden" : "hidden lg:inline"} text-sm truncate`}>{label}</span>
      </span>
      <ChevronDown className={`${iconOnly ? "hidden" : "hidden lg:inline"} w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

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
  const MAIN_ITEMS = buildMainItems(t);
  const TOOLS_ITEMS = buildToolsItems(t);
  const ADMIN_ITEMS = buildAdminItems(t);
  const base = `/projects/${slug}`;

  // phase is optional only so this component doesn't hard-crash on a caller
  // that hasn't been updated yet — falls back to "no grouping" (everything
  // in `current`) rather than guessing a phase.
  const { current: currentMainItems, early: earlyMainItems, locked: lockedMainItems } = phase
    ? groupNavItemsByPhase(MAIN_ITEMS, phase, completedChecklistKeys ?? [])
    : { current: MAIN_ITEMS, early: [] as NavItem[], locked: [] as NavItem[] };

  function isActive(href: string) {
    if (href === "/kanaler") return pathname.startsWith("/messages");
    if (href === "/fork/new") return pathname.startsWith("/fork");
    const full = `${base}${href}`;
    return href === ""
      ? pathname === base
      : pathname === full || pathname.startsWith(`${full}/`);
  }

  function hrefFor(item: NavItem) {
    return item.getHref ? item.getHref(slug) : `${base}${item.href}`;
  }

  const onHome = pathname === base;
  const [collapsedOverride, setCollapsedOverride] = useState<boolean | null>(null);
  useEffect(() => {
    const stored = window.localStorage.getItem(SIDENAV_COLLAPSED_STORAGE_KEY);
    if (stored === "true" || stored === "false") setCollapsedOverride(stored === "true");
  }, []);
  const iconOnly = collapsedOverride !== null ? collapsedOverride : !onHome;

  function toggleIconOnly() {
    const next = !iconOnly;
    setCollapsedOverride(next);
    try {
      window.localStorage.setItem(SIDENAV_COLLAPSED_STORAGE_KEY, String(next));
    } catch {
      // ignore storage errors (e.g. private browsing)
    }
  }

  const visibleToolsItems = TOOLS_ITEMS.filter((item) => !item.commercialOnly || isCommercial);
  const toolsActive = visibleToolsItems.some((item) => isActive(item.href));
  const adminActive = ADMIN_ITEMS.some((item) => isActive(item.href));
  const earlyActive = earlyMainItems.some((item) => isActive(item.href));

  const [toolsOpen, setToolsOpen] = useState(toolsActive);
  const [adminOpen, setAdminOpen] = useState(adminActive);
  const [earlyOpen, setEarlyOpen] = useState(earlyActive);

  const mobileItems = [
    ...currentMainItems,
    ...earlyMainItems,
    ...visibleToolsItems,
    ...(isOwner ? ADMIN_ITEMS : []),
  ];

  return (
    <>
      {/* Mobile / narrow: horizontal scrollable bar (the vertical rail has no room here) */}
      <div
        className="flex sm:hidden w-full min-w-0 flex-nowrap items-center gap-1 overflow-x-auto px-2 py-2 border-b border-muted-teal/20 scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const href = hrefFor(item);
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={href}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                active ? "bg-coral/10 text-dark-slate font-bold" : "text-dark-slate/60 hover:bg-gray-50 hover:text-dark-slate"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Tablet / desktop: persistent vertical rail */}
      <nav className={`hidden sm:block relative shrink-0 w-16 ${iconOnly ? "" : "lg:w-56"}`}>
        {/* On the Startsidan the rail spans the full hero height (for sticky/stretch layout), but its
            gray fill must start only where the hero's background image ends, not cover the image —
            and the actual nav items should still line up with the phase-journey bar below the hero. */}
        <div
          className="absolute left-0 right-0 bottom-0 border-r border-muted-teal/20"
          style={{ top: onHome ? "490px" : 0, backgroundColor: "#f6f5f2" }}
        />
        {onHome && <div aria-hidden style={{ height: "490px" }} />}
        <div className="relative sm:sticky sm:top-0 max-h-screen overflow-y-auto py-3 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        <button
          type="button"
          onClick={toggleIconOnly}
          title={iconOnly ? t("toggleMenuExpand") : t("toggleMenuCollapse")}
          aria-label={iconOnly ? t("toggleMenuExpand") : t("toggleMenuCollapse")}
          className={`group flex items-center gap-3 rounded-lg py-2 mx-2 mb-2 pl-2 pr-2 transition-colors justify-center ${
            iconOnly ? "" : "lg:justify-start"
          } text-dark-slate/60 hover:bg-white hover:text-dark-slate`}
        >
          <Menu className="w-5 h-5 shrink-0" strokeWidth={2} />
        </button>
        <div className="space-y-0.5">
          {currentMainItems.map((item) => (
            <Row
              key={item.href}
              item={item}
              active={isActive(item.href)}
              href={hrefFor(item)}
              iconOnly={iconOnly}
            />
          ))}

          {earlyMainItems.length > 0 && (
            <div className="pt-1">
              <GroupToggle label={t("earlyToolsGroupLabel")} icon={History} open={earlyOpen} active={earlyActive} onClick={() => setEarlyOpen((v) => !v)} iconOnly={iconOnly} />
              {earlyOpen && (
                <div className="space-y-0.5 mt-0.5">
                  {earlyMainItems.map((item) => (
                    <Row key={item.href} item={item} active={isActive(item.href)} href={hrefFor(item)} indent iconOnly={iconOnly} />
                  ))}
                </div>
              )}
            </div>
          )}

          {lockedMainItems.length > 0 && (
            <div className="space-y-0.5 pt-1">
              {lockedMainItems.map((item) => (
                <Row key={item.href} item={item} active={false} href="#" iconOnly={iconOnly} locked />
              ))}
            </div>
          )}

          <div className="pt-1">
            <GroupToggle label={t("toolsGroupLabel")} icon={Users2} open={toolsOpen} active={toolsActive} onClick={() => setToolsOpen((v) => !v)} iconOnly={iconOnly} />
            {toolsOpen && (
              <div className="space-y-0.5 mt-0.5">
                {visibleToolsItems.map((item) => (
                  <Row key={item.href} item={item} active={isActive(item.href)} href={hrefFor(item)} indent iconOnly={iconOnly} />
                ))}
              </div>
            )}
          </div>

          {isOwner && (
            <div className="pt-1">
              <GroupToggle label={t("adminGroupLabel")} icon={Settings} open={adminOpen} active={adminActive} onClick={() => setAdminOpen((v) => !v)} iconOnly={iconOnly} />
              {adminOpen && (
                <div className="space-y-0.5 mt-0.5">
                  {ADMIN_ITEMS.map((item) => (
                    <Row key={item.href} item={item} active={isActive(item.href)} href={hrefFor(item)} indent iconOnly={iconOnly} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </nav>
    </>
  );
}

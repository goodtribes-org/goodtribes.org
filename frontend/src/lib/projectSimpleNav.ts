import { FileText, Flag, HandCoins, Home, ListChecks, MessageCircle, Settings, type LucideIcon } from "lucide-react";
import { overviewPathFor, type ProjectPhaseValue } from "@/lib/projectPhase";

// PROTOTYPE (proto/phases-top-tools-left): the project menu cut from 37
// entries to 7. Nothing is removed — tools that belong together become tabs
// on one entry (PROJECT_HUBS, rendered by HubTabs at the top of each of those
// pages), and the phase tools live on the current phase's one-page overview,
// which the phase bars in the header also lead to.

type Tt = (key: string, values?: Record<string, string>) => string;

export type HubTab = { key: string; href: string; labelKey: string; commercialOnly?: boolean };
export type Hub = { key: string; label: string; icon: LucideIcon; tabs: HubTab[]; leadsOnly?: boolean };

// hrefs relative to /projects/[slug] (like the old nav items); labels are
// ProjectSideNav keys. Hub names are hard-coded Swedish in the prototype.
export const PROJECT_HUBS: Hub[] = [
  {
    key: "work",
    label: "Att göra",
    icon: ListChecks,
    tabs: [
      { key: "tasks", href: "/tasks", labelKey: "navTasks" },
      { key: "calendar", href: "/calendar", labelKey: "navCalendar" },
      { key: "roadmap", href: "/roadmap", labelKey: "navRoadmap" },
    ],
  },
  {
    key: "docs",
    label: "Dokument",
    icon: FileText,
    tabs: [
      { key: "wiki", href: "/wiki", labelKey: "navWiki" },
      { key: "files", href: "/files", labelKey: "navFiles" },
      { key: "updates", href: "/updates", labelKey: "navBlog" },
    ],
  },
  {
    key: "money",
    label: "Pengar och beslut",
    icon: HandCoins,
    tabs: [
      { key: "polls", href: "/polls", labelKey: "navPolls" },
      { key: "funding", href: "/funding", labelKey: "navFunding" },
      { key: "applications", href: "/funding-applications", labelKey: "navFundingApplications" },
      { key: "tokens", href: "/tokens", labelKey: "navTokens" },
      { key: "profit", href: "/profit-distribution", labelKey: "navProfitDistribution", commercialOnly: true },
    ],
  },
  {
    key: "settings",
    label: "Inställningar",
    icon: Settings,
    leadsOnly: true,
    tabs: [
      { key: "edit", href: "/edit", labelKey: "navEdit" },
      { key: "members", href: "/members", labelKey: "navMembers" },
      { key: "alumni", href: "/alumni", labelKey: "navAlumni" },
      { key: "partnerships", href: "/partnerships", labelKey: "navPartnerships" },
      { key: "legal", href: "/legal-type", labelKey: "navLegalType" },
      { key: "ai", href: "/ai-review", labelKey: "navAiReview" },
    ],
  },
];

export type SimpleNavEntry = { key: string; label: string; href: string; icon: LucideIcon; matches: (path: string) => boolean };

export function visibleTabs(hub: Hub, isCommercial?: boolean): HubTab[] {
  return hub.tabs.filter((tab) => !tab.commercialOnly || isCommercial);
}

// The hub (if any) the current path belongs to — drives both the menu's
// active row and HubTabs.
export function hubForPath(path: string, base: string): Hub | null {
  return PROJECT_HUBS.find((h) => h.tabs.some((tab) => path === `${base}${tab.href}` || path.startsWith(`${base}${tab.href}/`))) ?? null;
}

export function buildSimpleProjectNav(
  t: Tt,
  tMenu: Tt,
  tPhase: (phase: string) => string,
  ctx: { slug: string; phase?: ProjectPhaseValue; isOwner?: boolean },
): SimpleNavEntry[] {
  const base = `/projects/${ctx.slug}`;
  const hub = (key: string): SimpleNavEntry => {
    const h = PROJECT_HUBS.find((x) => x.key === key)!;
    return { key: h.key, label: h.label, href: `${base}${h.tabs[0].href}`, icon: h.icon, matches: (p) => hubForPath(p, base)?.key === h.key };
  };
  const phaseOverview = ctx.phase ? `${base}/${overviewPathFor(ctx.phase)}` : null;
  return [
    { key: "home", label: "Översikt", href: base, icon: Home, matches: (p) => p === base },
    hub("work"),
    { key: "chat", label: t("navChat"), href: `/messages?project=${ctx.slug}`, icon: MessageCircle, matches: (p) => p.startsWith("/messages") },
    hub("docs"),
    ...(ctx.phase && phaseOverview
      ? [{ key: "phase", label: tMenu("overviewLinkLabel", { phase: tPhase(ctx.phase) }), href: phaseOverview, icon: Flag, matches: (p: string) => p === phaseOverview }]
      : []),
    hub("money"),
    ...(ctx.isOwner ? [hub("settings")] : []),
  ];
}

"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useState } from "react";
import {
  Home,
  ListChecks,
  Calendar,
  MessageCircle,
  Wrench,
  Vote,
  Megaphone,
  Lightbulb,
  LayoutGrid,
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
  type LucideIcon,
} from "lucide-react";

type NavItem = { label: string; href: string; icon: LucideIcon; getHref?: (slug: string) => string; commercialOnly?: boolean };

const MAIN_ITEMS: NavItem[] = [
  { label: "Startsidan",    href: "",          icon: Home },
  { label: "Uppgifter",     href: "/tasks",     icon: ListChecks },
  { label: "Kalender",      href: "/calendar",  icon: Calendar },
  { label: "Kommunikation", href: "/kanaler",   icon: MessageCircle, getHref: (slug) => `/messages?project=${slug}` },
];

const TOOLS_ITEMS: NavItem[] = [
  { label: "Omröstningar",    href: "/polls",              icon: Vote },
  { label: "Idéverkstad",     href: "/idea-sessions",       icon: Lightbulb },
  { label: "Uppdateringar",   href: "/updates",             icon: Megaphone },
  { label: "Lean Canvas",     href: "/lean-canvas",         icon: LayoutGrid },
  { label: "Resurser",        href: "/wiki",                icon: BookOpen },
  { label: "Filer",           href: "/files",               icon: Folder },
  { label: "Bidrag",          href: "/funding",             icon: HandCoins },
  { label: "Tokens",          href: "/tokens",               icon: Coins },
  { label: "Impact",          href: "/impact",              icon: Target },
  { label: "AI Granskning",   href: "/ai-review",           icon: Bot },
  { label: "Alumni",          href: "/alumni",              icon: GraduationCap },
  { label: "Skalning",        href: "/scale",               icon: TrendingUp },
  { label: "Partnerskap",     href: "/partnerships",        icon: Handshake },
  { label: "Juridisk form",   href: "/legal-type",          icon: Scale },
  { label: "Vinstfördelning", href: "/profit-distribution", icon: PiggyBank, commercialOnly: true },
  { label: "Fork",            href: "/fork/new",            icon: GitFork, getHref: (slug) => `/fork/new?sourceId=${slug}` },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: "Redigera",  href: "/edit",    icon: Pencil },
  { label: "Medlemmar", href: "/members", icon: Users },
];

function Row({
  item,
  active,
  href,
  indent,
  iconOnly,
}: {
  item: NavItem;
  active: boolean;
  href: string;
  indent?: boolean;
  iconOnly?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={href}
      title={item.label}
      className={`group flex items-center gap-3 rounded-lg py-2 mx-2 pl-2 pr-2 transition-colors border-l-4 ${
        indent && !iconOnly ? "lg:pl-6" : "lg:pl-3"
      } justify-center ${iconOnly ? "" : "lg:justify-start"} ${
        active
          ? "border-coral bg-coral/10 text-dark-slate font-bold"
          : "border-transparent text-dark-slate/60 hover:bg-white hover:text-dark-slate"
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
      <span className={`${iconOnly ? "hidden" : "hidden lg:inline"} text-sm truncate`}>{item.label}</span>
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
}: {
  slug: string;
  isOwner?: boolean;
  isCommercial?: boolean;
}) {
  const pathname = usePathname();
  const base = `/projects/${slug}`;

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
  const iconOnly = !onHome;

  const visibleToolsItems = TOOLS_ITEMS.filter((t) => !t.commercialOnly || isCommercial);
  const toolsActive = visibleToolsItems.some((t) => isActive(t.href));
  const adminActive = ADMIN_ITEMS.some((t) => isActive(t.href));

  const [toolsOpen, setToolsOpen] = useState(toolsActive);
  const [adminOpen, setAdminOpen] = useState(adminActive);

  const mobileItems = [
    ...MAIN_ITEMS,
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
          className="absolute left-0 right-0 bottom-0 bg-gray-50 border-r border-muted-teal/20"
          style={{ top: onHome ? "490px" : 0 }}
        />
        {onHome && <div aria-hidden style={{ height: "490px" }} />}
        <div className="relative sm:sticky sm:top-0 max-h-screen overflow-y-auto py-3 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        <div className="space-y-0.5">
          {MAIN_ITEMS.map((item) => (
            <Row
              key={item.href}
              item={item}
              active={isActive(item.href)}
              href={hrefFor(item)}
              iconOnly={iconOnly}
            />
          ))}

          <div className="pt-1">
            <GroupToggle label="Verktyg" icon={Wrench} open={toolsOpen} active={toolsActive} onClick={() => setToolsOpen((v) => !v)} iconOnly={iconOnly} />
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
              <GroupToggle label="Admin" icon={Settings} open={adminOpen} active={adminActive} onClick={() => setAdminOpen((v) => !v)} iconOnly={iconOnly} />
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

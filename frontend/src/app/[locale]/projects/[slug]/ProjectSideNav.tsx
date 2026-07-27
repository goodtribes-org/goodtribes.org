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
  Settings,
  Pencil,
  Users,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";

type NavItem = { label: string; href: string; icon: LucideIcon; absolute?: boolean; commercialOnly?: boolean };

const MAIN_ITEMS: NavItem[] = [
  { label: "Startsidan",    href: "",          icon: Home },
  { label: "Uppgifter",     href: "/tasks",     icon: ListChecks },
  { label: "Kalender",      href: "/calendar",  icon: Calendar },
  { label: "Kommunikation", href: "/kanaler",   icon: MessageCircle, absolute: true },
];

const TOOLS_ITEMS: NavItem[] = [
  { label: "Omröstningar",    href: "/polls",              icon: Vote },
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
}: {
  item: NavItem;
  active: boolean;
  href: string;
  indent?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={href}
      title={item.label}
      className={`group flex items-center gap-3 rounded-lg py-2 mx-2 pl-2 pr-2 transition-colors border-l-4 ${
        indent ? "lg:pl-6" : "lg:pl-3"
      } justify-center lg:justify-start ${
        active
          ? "border-coral bg-coral/10 text-dark-slate font-bold"
          : "border-transparent text-dark-slate/60 hover:bg-gray-50 hover:text-dark-slate"
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
      <span className="hidden lg:inline text-sm truncate">{item.label}</span>
    </Link>
  );
}

function GroupToggle({
  label,
  icon: Icon,
  open,
  active,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  open: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex items-center gap-3 rounded-lg py-2 mx-2 pl-2 lg:pl-3 pr-2 transition-colors border-l-4 justify-center lg:justify-between ${
        active
          ? "border-coral bg-coral/10 text-dark-slate font-bold"
          : "border-transparent text-dark-slate/60 hover:bg-gray-50 hover:text-dark-slate"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
        <span className="hidden lg:inline text-sm truncate">{label}</span>
      </span>
      <ChevronDown className={`hidden lg:inline w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
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
    const full = `${base}${href}`;
    return href === ""
      ? pathname === base
      : pathname === full || pathname.startsWith(`${full}/`);
  }

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
        className="flex sm:hidden w-full flex-nowrap items-center gap-1 overflow-x-auto px-2 py-2 border-b border-muted-teal/20 scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const href = item.absolute ? `/messages?project=${slug}` : `${base}${item.href}`;
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
      <nav className="hidden sm:block sm:sticky sm:top-0 sm:self-start max-h-screen overflow-y-auto shrink-0 w-16 lg:w-56 py-3 border-r border-muted-teal/20 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        <div className="space-y-0.5">
          {MAIN_ITEMS.map((item) => (
            <Row
              key={item.href}
              item={item}
              active={isActive(item.href)}
              href={item.absolute ? `/messages?project=${slug}` : `${base}${item.href}`}
            />
          ))}

          <div className="pt-1">
            <GroupToggle label="Verktyg" icon={Wrench} open={toolsOpen} active={toolsActive} onClick={() => setToolsOpen((v) => !v)} />
            {toolsOpen && (
              <div className="space-y-0.5 mt-0.5">
                {visibleToolsItems.map((item) => (
                  <Row key={item.href} item={item} active={isActive(item.href)} href={`${base}${item.href}`} indent />
                ))}
              </div>
            )}
          </div>

          {isOwner && (
            <div className="pt-1">
              <GroupToggle label="Admin" icon={Settings} open={adminOpen} active={adminActive} onClick={() => setAdminOpen((v) => !v)} />
              {adminOpen && (
                <div className="space-y-0.5 mt-0.5">
                  {ADMIN_ITEMS.map((item) => (
                    <Row key={item.href} item={item} active={isActive(item.href)} href={`${base}${item.href}`} indent />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}

"use client";

import {
  Award, BookOpen, Building2, Coins, FileText, Flag, FolderKanban, Gavel, GraduationCap, HandCoins, Home,
  Landmark, LayoutDashboard, MessageSquareText, PieChart, QrCode, Scale, ShoppingBag, Sparkles, ToggleLeft, TrendingUp, Users,
  type LucideIcon,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { SITE_ADMIN_GROUPS, type AdminQueue } from "@/lib/siteAdminNav";

const ICONS: Record<string, LucideIcon> = {
  "/site-admin": LayoutDashboard,
  "/site-admin/content-flags": Flag,
  "/site-admin/ethics": Scale,
  "/site-admin/impact-reports": Award,
  "/site-admin/suggestions": MessageSquareText,
  "/site-admin/metrics": TrendingUp,
  "/site-admin/users": Users,
  "/site-admin/organisations": Building2,
  "/site-admin/council": Gavel,
  "/site-admin/projects": FolderKanban,
  "/site-admin/invoicing": GraduationCap,
  "/site-admin/legal-type": Landmark,
  "/site-admin/profit-distribution": PieChart,
  "/site-admin/impact-fund": HandCoins,
  "/site-admin/funding-sources": BookOpen,
  "/site-admin/shop": ShoppingBag,
  "/site-admin/token-backfill": Coins,
  "/site-admin/hero-carousel": Home,
  "/site-admin/about-pillars": Sparkles,
  "/site-admin/site-copy": FileText,
  "/site-admin/feature-flags": ToggleLeft,
  "/site-admin/events": QrCode,
};

// The site-admin menu, in the same look as the project pages' left menu
// (ProjectSideNav): a full-height rail, an icon per row, the current page
// marked with the coral bar. Grouped by area, with how many are waiting.
// On narrow screens a folded list above the page.
export default function AdminNav({ counts }: { counts: Record<AdminQueue, number> }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/site-admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  const waiting = Object.values(counts).reduce((a, b) => a + b, 0);

  const row = (href: string, label: string, count?: number) => {
    const Icon = ICONS[href] ?? FileText;
    const on = active(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={on ? "page" : undefined}
        className={`mx-2 flex items-center gap-3 rounded-lg border-l-4 py-2 pl-3 pr-2 text-sm transition-colors ${
          on ? "border-coral bg-coral/10 font-bold text-dark-slate" : "border-transparent text-dark-slate/60 hover:bg-dark-slate/[0.05] hover:text-dark-slate"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
        <span className="flex-1 truncate">{label}</span>
        {!!count && <span className="shrink-0 rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{count}</span>}
      </Link>
    );
  };

  const list = (
    <div className="space-y-3">
      <div className="space-y-0.5">{row("/site-admin", "Översikt", waiting)}</div>
      {SITE_ADMIN_GROUPS.map((g) => (
        <div key={g.title}>
          <p className="mb-1 px-5 text-[11px] font-semibold uppercase tracking-wide text-dark-slate/40">{g.title}</p>
          <div className="space-y-0.5">{g.items.map((i) => row(i.href, i.short ?? i.label, i.count ? counts[i.count] : undefined))}</div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <nav aria-label="Adminmeny" className="relative hidden w-56 shrink-0 lg:block">
        <div className="absolute inset-0 border-r border-[#E2E2E0]" style={{ backgroundColor: "#FBFBF9" }} />
        <div className="sticky top-0 max-h-screen overflow-y-auto py-3" style={{ scrollbarWidth: "none" }}>
          {list}
        </div>
      </nav>
      <details className="mx-4 mt-4 rounded-xl border border-dark-slate/10 bg-white py-3 lg:hidden">
        <summary className="cursor-pointer px-4 text-sm font-semibold text-dark-slate">Adminmeny{waiting ? ` · ${waiting} väntar` : ""}</summary>
        <div className="mt-3">{list}</div>
      </details>
    </>
  );
}

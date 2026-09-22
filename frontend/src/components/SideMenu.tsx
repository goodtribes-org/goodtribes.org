"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  Menu,
  X,
  Home,
  Plus,
  Compass,
  Sparkles,
  User,
  ShieldCheck,
  FolderKanban,
  type LucideIcon,
} from "lucide-react";
import { ACCOUNT_NAV_ITEMS } from "@/lib/accountNav";
import { SITE_ADMIN_NAV } from "@/lib/siteAdminNav";

type Item = { href: string; label: string };
type Section = { key: string; title: string; icon: LucideIcon; items: Item[] };

// Top-level /projects/<segment> routes that are NOT a project slug.
const NON_SLUG_PROJECT_SEGMENTS = new Set(["new"]);

function projectSlugFrom(pathname: string): string | null {
  const m = pathname.match(/^\/projects\/([^/]+)/);
  if (!m || NON_SLUG_PROJECT_SEGMENTS.has(m[1])) return null;
  return m[1];
}

function isActive(pathname: string, href: string) {
  const path = href.split("?")[0];
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * Hamburger + slide-in drawer left of the logo (GitHub/Kayak style). Replaces
 * the old inline Skapa/Utforska/Drömfabriken links. "Dynamic" in two ways:
 * a context section for where the user currently is (a project, site-admin,
 * their account) is shown first, and the section containing the current page
 * is highlighted.
 */
export default function SideMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useTranslations("Nav");
  const tAccount = useTranslations("Account");
  const tProject = useTranslations("ProjectSideNav");

  useEffect(() => setMounted(true), []);

  // Close whenever navigation happens (a Link click inside the drawer, or back/forward).
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const loggedIn = !!session?.user;
  const isAdmin = loggedIn && session?.user?.siteRole !== "USER";

  const create: Section = {
    key: "create",
    title: t("create"),
    icon: Plus,
    items: [
      { href: "/projects/new", label: t("createNewProject") },
      { href: "/ideas/new", label: t("createNewIdea") },
      { href: "/lean-canvas/new", label: t("createLeanCanvas") },
      { href: "/value-proposition/new", label: t("createValueProposition") },
      { href: "/whiteboard/new", label: t("createWhiteboard") },
    ],
  };
  const discover: Section = {
    key: "discover",
    title: t("discover"),
    icon: Compass,
    items: [
      { href: "/projects", label: t("discoverProjects") },
      { href: "/ideas", label: t("discoverIdeas") },
      // Idéverkstaden redirects guests to /login — don't show a dead-end link.
      ...(loggedIn ? [{ href: "/ideaverkstad", label: t("discoverIdeaverkstad") }] : []),
      { href: "/org", label: t("discoverOrgs") },
      { href: "/micro-tasks", label: t("discoverMicroTasks") },
      { href: "/skill", label: t("discoverSkills") },
      { href: "/mentors", label: t("discoverMentors") },
    ],
  };
  const sandbox: Section = {
    key: "sandbox",
    title: t("sandbox"),
    icon: Sparkles,
    items: [{ href: "/sandbox", label: t("sandboxHome") }],
  };
  const account: Section | null = loggedIn
    ? {
        key: "account",
        title: t("myAccount"),
        icon: User,
        items: ACCOUNT_NAV_ITEMS.map((i) => ({ href: i.href, label: tAccount(i.labelKey) })),
      }
    : null;
  const admin: Section | null = isAdmin
    ? {
        key: "admin",
        title: t("siteAdmin"),
        icon: ShieldCheck,
        items: [{ href: "/site-admin", label: tAccount("admin") }, ...SITE_ADMIN_NAV],
      }
    : null;

  const slug = projectSlugFrom(pathname);
  const project: Section | null = slug
    ? {
        key: "project",
        title: t("thisProject"),
        icon: FolderKanban,
        items: [
          { href: `/projects/${slug}`, label: tProject("navHome") },
          { href: `/projects/${slug}/tasks`, label: tProject("navTasks") },
          { href: `/projects/${slug}/calendar`, label: tProject("navCalendar") },
          { href: `/messages?project=${slug}`, label: tProject("navChat") },
          { href: `/projects/${slug}/wiki`, label: tProject("navWiki") },
          { href: `/projects/${slug}/files`, label: tProject("navFiles") },
          { href: `/projects/${slug}/polls`, label: tProject("navPolls") },
        ],
      }
    : null;

  // Context section first: whatever area the user is in right now.
  let context: Section | null = project;
  if (!context && admin && pathname.startsWith("/site-admin")) context = admin;
  if (!context && account && account.items.some((i) => isActive(pathname, i.href))) context = account;
  if (!context && pathname.startsWith("/sandbox")) context = sandbox;

  const rest = [create, discover, sandbox, account, admin].filter(
    (s): s is Section => !!s && s !== context,
  );

  // Collapse the long admin list unless the user is already in site-admin.
  function initiallyOpen(s: Section) {
    if (s === context) return true;
    if (s.key === "admin") return false;
    return true;
  }

  const activeHref = [context, ...rest]
    .flatMap((s) => s?.items ?? [])
    .map((i) => i.href)
    .filter((h) => isActive(pathname, h))
    // Most specific match wins (/projects/x/tasks over /projects/x, /projects/new over /projects).
    .sort((a, b) => b.length - a.length)[0];

  const drawer = (
    <div className="fixed inset-0 z-[10001]" role="dialog" aria-modal="true" aria-label={t("menu")}>
      <button
        type="button"
        aria-label={t("closeMenu")}
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-dark-slate/30 animate-[fadeIn_150ms_ease-out]"
      />
      <aside className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-xl flex flex-col animate-[slideIn_180ms_ease-out]">
        <div className="flex items-center justify-between px-4 h-[74px] border-b border-muted-teal/30 shrink-0">
          <span className="font-semibold text-dark-slate">{t("menu")}</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("closeMenu")}
            className="p-2 rounded-lg text-dark-slate/60 hover:text-dark-slate hover:bg-dry-sage/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 text-sm">
          <Link
            href="/"
            className={`flex items-center gap-3 mx-2 px-3 py-2 rounded-lg ${
              pathname === "/" ? "bg-seagrass/10 text-seagrass font-semibold" : "text-dark-slate/80 hover:bg-dry-sage/20"
            }`}
          >
            <Home className="w-4 h-4" />
            {t("home")}
          </Link>

          {context && (
            <MenuSection section={context} activeHref={activeHref} highlighted defaultOpen />
          )}
          {project && context === project && (
            <p className="mx-5 mt-1 mb-2 text-[11px] text-dark-slate/40">{t("projectAllSections")}</p>
          )}

          {rest.map((s) => (
            <MenuSection key={s.key} section={s} activeHref={activeHref} defaultOpen={initiallyOpen(s)} />
          ))}

          <div className="mx-4 my-3 border-t border-muted-teal/20" />
          {loggedIn ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="mx-2 px-3 py-2 text-left text-dark-slate/50 hover:text-dark-slate"
            >
              {t("logOut")}
            </button>
          ) : (
            <Link href="/login" className="block mx-2 px-3 py-2 rounded-lg font-semibold text-seagrass hover:bg-dry-sage/20">
              {t("signIn")}
            </Link>
          )}
        </nav>
      </aside>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("menu")}
        aria-expanded={open}
        data-tour="nav-discover"
        className="shrink-0 p-2 -ml-1 rounded-lg text-dark-slate/70 hover:text-dark-slate hover:bg-dry-sage/20 border border-transparent hover:border-muted-teal/40 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>
      {/* Portal to <body>: SiteHeader is its own z-30 stacking context, which
          would otherwise trap the drawer underneath page content/overlays. */}
      {mounted && open && createPortal(drawer, document.body)}
    </>
  );
}

function MenuSection({
  section,
  activeHref,
  highlighted,
  defaultOpen,
}: {
  section: Section;
  activeHref: string | undefined;
  highlighted?: boolean;
  defaultOpen: boolean;
}) {
  const containsActive = section.items.some((i) => i.href === activeHref);
  const [expanded, setExpanded] = useState(defaultOpen || containsActive);
  const Icon = section.icon;

  return (
    <div className={`mt-2 ${highlighted ? "mx-2 rounded-xl bg-dry-sage/15 pb-2" : ""}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center gap-3 px-5 pt-2 pb-1 text-xs font-semibold uppercase tracking-widest ${
          highlighted ? "px-3 text-seagrass" : "text-dark-slate/40 hover:text-dark-slate/70"
        }`}
      >
        <Icon className="w-4 h-4" />
        <span className="flex-1 text-left">{section.title}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {expanded &&
        section.items.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`block ${highlighted ? "mx-1" : "mx-2"} pl-10 pr-3 py-1.5 rounded-lg ${
                active
                  ? "bg-seagrass/10 text-seagrass font-semibold"
                  : "text-dark-slate/75 hover:text-dark-slate hover:bg-dry-sage/20"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
    </div>
  );
}

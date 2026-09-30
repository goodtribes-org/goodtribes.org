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
  FolderKanban,
  Lock,
  MessageCircle,
  Pin,
  PinOff,
  type LucideIcon,
} from "lucide-react";
import { buildProjectNavGroups, type Group, type NavItem } from "@/app/[locale]/projects/[slug]/ProjectTopNav";
import { setProjectMenuPinned, useProjectMenuContext, useProjectMenuPinned, type ProjectMenuContext } from "@/lib/projectMenuStore";

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
  // PROTOTYPE: the project page publishes its context (projectMenuStore), so
  // the drawer can hold that project's full, phase-aware tool menu.
  const projectContext = useProjectMenuContext();
  const pinned = useProjectMenuPinned();

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
  const context: Section | null = project;

  const rest = [create, discover].filter(
    (s): s is Section => !!s && s !== context,
  );

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

          {projectContext && projectContext.slug === slug ? (
            <ProjectTools
              ctx={projectContext}
              pinned={pinned}
              onPin={() => {
                setProjectMenuPinned(!pinned);
                setOpen(false);
              }}
            />
          ) : (
            <>
              {context && <MenuSection section={context} activeHref={activeHref} highlighted defaultOpen />}
              {project && context === project && (
                <p className="mx-5 mt-1 mb-2 text-[11px] text-dark-slate/40">{t("projectAllSections")}</p>
              )}
            </>
          )}

          {rest.map((s) => (
            // Inside a project the site-wide sections start folded, so the
            // project's tools stay at the top without a long scroll.
            <MenuSection key={s.key} section={s} activeHref={activeHref} defaultOpen={!projectContext} />
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
        <span className="flex items-center gap-1.5">
          <Menu className="w-5 h-5" />
          {/* PROTOTYPE: a visible label on wide screens — a bare ☰ is easy to miss on desktop. */}
          <span className="hidden lg:inline text-sm font-medium">{t("menu")}</span>
        </span>
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

// PROTOTYPE: the project's full tool menu inside the drawer — same groups as
// the old tabs and the pinned rail (buildProjectNavGroups), phase-aware:
// current-phase tools first, "tidiga" and locked later-phase tools after.
function ProjectTools({ ctx, pinned, onPin }: { ctx: ProjectMenuContext; pinned: boolean; onPin: () => void }) {
  const t = useTranslations("Nav");
  const tProject = useTranslations("ProjectSideNav");
  const pathname = usePathname();
  const base = `/projects/${ctx.slug}`;
  const groups = buildProjectNavGroups(tProject, ctx);
  const [closed, setClosed] = useState<Set<string>>(() => new Set(["community", "admin"]));

  const hrefFor = (item: NavItem) => (item.getHref ? item.getHref(ctx.slug) : `${base}${item.href}`);
  const activeFor = (href: string) => {
    if (href === "/kanaler") return pathname.startsWith("/messages");
    const full = `${base}${href}`;
    return href === "" ? pathname === base : pathname === full || pathname.startsWith(`${full}/`);
  };

  const row = (label: string, href: string, Icon: LucideIcon, active: boolean) => (
    <Link
      key={href}
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 mx-1 pl-4 pr-3 py-1.5 rounded-lg ${
        active ? "bg-seagrass/10 text-seagrass font-semibold" : "text-dark-slate/75 hover:text-dark-slate hover:bg-dry-sage/20"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
      <span className="truncate">{label}</span>
    </Link>
  );

  const group = (g: Group) => {
    const Icon = g.icon;
    const open = !closed.has(g.key);
    return (
      <div key={g.key} className="mt-1">
        <button
          type="button"
          onClick={() => setClosed((prev) => { const n = new Set(prev); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })}
          aria-expanded={open}
          className="w-full flex items-center gap-2 px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-dark-slate/45 hover:text-dark-slate/70"
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">{g.label}</span>
          <span className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>▾</span>
        </button>
        {open && (
          <>
            {g.items.map((i) => row(i.label, hrefFor(i), i.icon, activeFor(i.href)))}
            {g.early && g.early.length > 0 && (
              <>
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-dark-slate/35">{tProject("earlyToolsGroupLabel")}</p>
                {g.early.map((i) => row(i.label, hrefFor(i), i.icon, activeFor(i.href)))}
              </>
            )}
            {g.locked && g.locked.length > 0 && (
              <>
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-dark-slate/35">{tProject("lockedHint")}</p>
                {g.locked.map((i) => {
                  const ItemIcon = i.icon;
                  return (
                    <div key={i.href} aria-disabled="true" className="flex items-center gap-2.5 mx-1 pl-4 pr-3 py-1.5 text-dark-slate/30 cursor-not-allowed">
                      <ItemIcon className="w-4 h-4 shrink-0" strokeWidth={2} />
                      <span className="flex-1 truncate">{i.label}</span>
                      <Lock className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="mt-2 mx-2 rounded-xl bg-dry-sage/15 pb-2">
      <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-seagrass">
          <FolderKanban className="w-4 h-4" /> {t("thisProject")}
        </span>
        <button
          type="button"
          onClick={onPin}
          title={pinned ? "Visa projektmenyn bara här i menyn igen" : "Håll projektmenyn öppen till vänster på projektsidorna"}
          className="hidden lg:flex items-center gap-1 rounded-full border border-muted-teal/40 bg-white px-2 py-0.5 text-[11px] font-medium text-dark-slate/60 hover:text-dark-slate"
        >
          {pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />} {pinned ? "Lossa menyn" : "Fäst menyn"}
        </button>
      </div>
      {row(tProject("navHome"), base, Home, activeFor(""))}
      {row(tProject("navChat"), `/messages?project=${ctx.slug}`, MessageCircle, activeFor("/kanaler"))}
      {groups.map(group)}
    </div>
  );
}

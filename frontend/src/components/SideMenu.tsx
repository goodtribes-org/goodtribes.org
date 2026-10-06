"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  Menu,
  X,
  Home,
  Lightbulb,
  Plus,
  Compass,
  FolderKanban,
  Pin,
  PinOff,
  type LucideIcon,
} from "lucide-react";
import { buildSimpleProjectNav } from "@/lib/projectSimpleNav";
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
      // One way in (#234): Din dröm asks first and lets you choose at the
      // end whether to run it yourself or share it as an idea.
      { href: "/projects/new", label: t("yourDream") },
      // No standalone canvases or whiteboards (2026-10-03): the tools are
      // tried inside a project, where they have a team, phases and AI.
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
      <aside className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[#FBFBF9] shadow-xl flex flex-col animate-[slideIn_180ms_ease-out]">
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
          <Link
            href="/how-it-works"
            className={`flex items-center gap-3 mx-2 px-3 py-2 rounded-lg ${
              pathname === "/how-it-works" ? "bg-seagrass/10 text-seagrass font-semibold" : "text-dark-slate/80 hover:bg-dry-sage/20"
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            {t("howItWorks")}
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

          {/* Signing in and out lives top right (AuthNav: the "Logga in"
              button, or the profile menu) — this menu is for getting around. */}
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

// PROTOTYPE: the project's menu inside the drawer — seven entries
// (lib/projectSimpleNav.ts). Merged entries open their first tab; HubTabs on
// those pages reach the rest, and the phase tools live on the phase overview.
function ProjectTools({ ctx, pinned, onPin }: { ctx: ProjectMenuContext; pinned: boolean; onPin: () => void }) {
  const t = useTranslations("Nav");
  const tProject = useTranslations("ProjectSideNav");
  const tMenu = useTranslations("PhaseMenuBar");
  const tPhase = useTranslations("ProjectPhase");
  const pathname = usePathname();
  const entries = buildSimpleProjectNav(
    tProject as unknown as (k: string, v?: Record<string, string>) => string,
    tMenu as unknown as (k: string, v?: Record<string, string>) => string,
    (ph) => tPhase(ph as Parameters<typeof tPhase>[0]),
    ctx,
  );

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
      {entries.map((e) => {
        const Icon = e.icon;
        const active = e.matches(pathname);
        return (
          <Link
            key={e.key}
            href={e.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 mx-1 pl-4 pr-3 py-2 rounded-lg ${
              active ? "bg-seagrass/10 text-seagrass font-semibold" : "text-dark-slate/80 hover:text-dark-slate hover:bg-dry-sage/20"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
            <span className="truncate">{e.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

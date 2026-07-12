"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ACCOUNT_NAV_ITEMS } from "@/lib/accountNav";

type Session = { user?: { name?: string | null; siteRole?: string } | null } | null;

interface Props {
  session: Session;
  onSignOut: () => void;
}

export default function NavMenu({ session, onSignOut }: Props) {
  const t = useTranslations("Nav");
  const tAccount = useTranslations("Account");
  const [open, setOpen] = useState(false);
  const [create, setCreate] = useState(false);
  const [discover, setDiscover] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);
  const discoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (createRef.current && !createRef.current.contains(e.target as Node)) {
        setCreate(false);
      }
      if (discoverRef.current && !discoverRef.current.contains(e.target as Node)) {
        setDiscover(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <>
      {/* Desktop links */}
      <div className="hidden md:flex items-center gap-4 text-sm">
        {/* Create dropdown */}
        <div ref={createRef} className="relative">
          <button
            onClick={() => setCreate((v) => !v)}
            className="flex items-center gap-1 font-bold text-dark-slate/70 hover:text-seagrass whitespace-nowrap"
          >
            {t("create")}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 mt-0.5 transition-transform ${create ? "rotate-180" : ""}`}>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          {create && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-muted-teal rounded-xl shadow-lg py-1.5 min-w-48 z-50">
              <Link href="/projects/new" onClick={() => setCreate(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">{t("createNewProject")}</Link>
              <Link href="/ideas/new" onClick={() => setCreate(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">{t("createNewIdea")}</Link>
              <Link href="/org/new" onClick={() => setCreate(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">{t("createNewOrg")}</Link>
            </div>
          )}
        </div>

        {/* Discover dropdown */}
        <div ref={discoverRef} className="relative">
          <button
            onClick={() => setDiscover((v) => !v)}
            className="flex items-center gap-1 font-bold text-dark-slate/70 hover:text-seagrass whitespace-nowrap"
          >
            {t("discover")}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 mt-0.5 transition-transform ${discover ? "rotate-180" : ""}`}>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          {discover && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-muted-teal rounded-xl shadow-lg py-1.5 min-w-48 z-50">
              <Link href="/projects" onClick={() => setDiscover(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">{t("discoverProjects")}</Link>
              <Link href="/ideas" onClick={() => setDiscover(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">{t("discoverIdeas")}</Link>
              <Link href="/org" onClick={() => setDiscover(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">{t("discoverOrgs")}</Link>
              <div className="my-1 border-t border-muted-teal/20" />
              <Link href="/skill" onClick={() => setDiscover(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">{t("discoverSkills")}</Link>
              <Link href="/mentors" onClick={() => setDiscover(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">{t("discoverMentors")}</Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden p-1 text-dark-slate/70 hover:text-dark-slate"
        onClick={() => setOpen(!open)}
        aria-label={t("toggleMenu")}
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-muted-teal md:hidden z-50 shadow-md">
          <nav className="max-w-6xl mx-auto px-6 py-3 flex flex-col">
            <p className="pt-1 pb-1 text-xs font-semibold text-dark-slate/40 uppercase tracking-widest">{t("create")}</p>
            <Link href="/projects/new" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">{t("createNewProject")}</Link>
            <Link href="/ideas/new" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">{t("createNewIdea")}</Link>
            <Link href="/org/new" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">{t("createNewOrg")}</Link>

            <p className="pt-3 pb-1 text-xs font-semibold text-dark-slate/40 uppercase tracking-widest">{t("discover")}</p>
            <Link href="/projects" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">{t("discoverProjects")}</Link>
            <Link href="/ideas" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">{t("discoverIdeas")}</Link>
            <Link href="/org" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">{t("discoverOrgs")}</Link>
            <Link href="/skill" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">{t("discoverSkills")}</Link>
            <Link href="/mentors" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">{t("discoverMentors")}</Link>

            {session?.user ? (
              <>
                <p className="pt-3 pb-1 text-xs font-semibold text-dark-slate/40 uppercase tracking-widest">{t("myAccount")}</p>
                {ACCOUNT_NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20"
                  >
                    {tAccount(item.labelKey)}
                  </Link>
                ))}
                {session.user.siteRole !== "USER" && (
                  <Link href="/site-admin" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">
                    {tAccount("admin")}
                  </Link>
                )}
                <Link href="/projects/new" onClick={() => setOpen(false)} className="py-3 text-coral font-semibold hover:text-watermelon border-b border-muted-teal/20">+ {t("createNewProject")}</Link>
                <button
                  onClick={() => { setOpen(false); onSignOut(); }}
                  className="py-3 text-left text-dark-slate/50 hover:text-dark-slate text-sm"
                >
                  {t("logOut")}
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="py-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">{t("signIn")}</Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}

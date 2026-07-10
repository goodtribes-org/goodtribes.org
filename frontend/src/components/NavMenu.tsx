"use client";

import { useState, useRef, useEffect } from "react";

type Session = { user?: { name?: string | null } | null } | null;

interface Props {
  session: Session;
  onSignOut: () => void;
}

export default function NavMenu({ session, onSignOut }: Props) {
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
            Create
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 mt-0.5 transition-transform ${create ? "rotate-180" : ""}`}>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          {create && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-muted-teal rounded-xl shadow-lg py-1.5 min-w-48 z-50">
              <a href="/projects/new" onClick={() => setCreate(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">New project</a>
              <a href="/ideas/new" onClick={() => setCreate(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">New idea</a>
              <a href="/org/new" onClick={() => setCreate(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">New organisation</a>
            </div>
          )}
        </div>

        {/* Discover dropdown */}
        <div ref={discoverRef} className="relative">
          <button
            onClick={() => setDiscover((v) => !v)}
            className="flex items-center gap-1 font-bold text-dark-slate/70 hover:text-seagrass whitespace-nowrap"
          >
            Discover
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 mt-0.5 transition-transform ${discover ? "rotate-180" : ""}`}>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          {discover && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-muted-teal rounded-xl shadow-lg py-1.5 min-w-48 z-50">
              <a href="/projects" onClick={() => setDiscover(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">Projects</a>
              <a href="/ideas" onClick={() => setDiscover(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">Ideas</a>
              <a href="/org" onClick={() => setDiscover(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">Organizations</a>
              <div className="my-1 border-t border-muted-teal/20" />
              <a href="/skill" onClick={() => setDiscover(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">Skills</a>
              <a href="/mentors" onClick={() => setDiscover(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">Mentors</a>
            </div>
          )}
        </div>
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden p-1 text-dark-slate/70 hover:text-dark-slate"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
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
            <p className="pt-1 pb-1 text-xs font-semibold text-dark-slate/40 uppercase tracking-widest">Create</p>
            <a href="/projects/new" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">New project</a>
            <a href="/ideas/new" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">New idea</a>
            <a href="/org/new" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">New organisation</a>

            <p className="pt-3 pb-1 text-xs font-semibold text-dark-slate/40 uppercase tracking-widest">Discover</p>
            <a href="/projects" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Projects</a>
            <a href="/ideas" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Ideas</a>
            <a href="/org" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Organizations</a>
            <a href="/skill" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Skills</a>
            <a href="/mentors" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Mentors</a>

            {session?.user ? (
              <>
                <p className="pt-3 pb-1 text-xs font-semibold text-dark-slate/40 uppercase tracking-widest">My account</p>
                <a href="/workplace" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Workplace</a>
                <a href="/dashboard" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Dashboard</a>
                <a href="/profile" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Profile</a>
                <a href="/settings" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Settings</a>
                <a href="/projects/new" onClick={() => setOpen(false)} className="py-3 text-coral font-semibold hover:text-watermelon border-b border-muted-teal/20">+ New project</a>
                <button
                  onClick={() => { setOpen(false); onSignOut(); }}
                  className="py-3 text-left text-dark-slate/50 hover:text-dark-slate text-sm"
                >
                  Log out
                </button>
              </>
            ) : (
              <a href="/login" onClick={() => setOpen(false)} className="py-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Sign in</a>
            )}
          </nav>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const [osorterat, setOsorterat] = useState(false);
  const osorteratRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (osorteratRef.current && !osorteratRef.current.contains(e.target as Node)) {
        setOsorterat(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <>
      {/* Desktop links */}
      <div className="hidden md:flex items-center gap-4 text-base">
        <Link href="/projects" className="font-bold text-dark-slate/70 hover:text-seagrass whitespace-nowrap">
          Projects
        </Link>
        <Link href="/ideas" className="font-bold text-dark-slate/70 hover:text-seagrass whitespace-nowrap">
          Ideas
        </Link>

        {/* Osorterat dropdown */}
        <div ref={osorteratRef} className="relative">
          <button
            onClick={() => setOsorterat((v) => !v)}
            className="flex items-center gap-1 font-bold text-dark-slate/70 hover:text-seagrass whitespace-nowrap"
          >
            Osorterat
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 mt-0.5 transition-transform ${osorterat ? "rotate-180" : ""}`}>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          {osorterat && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-muted-teal rounded-xl shadow-lg py-1.5 min-w-48 z-50">
              <Link href="/feed" onClick={() => setOsorterat(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">Flöde</Link>
              <Link href="/dream-wall" onClick={() => setOsorterat(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">Drömväggen</Link>
              <Link href="/hall-of-impact" onClick={() => setOsorterat(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">Hall of Impact</Link>
              <Link href="/academy" onClick={() => setOsorterat(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">Academy</Link>
              {session?.user && (
                <Link href="/match" onClick={() => setOsorterat(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">Hitta projekt</Link>
              )}
              <div className="my-1 border-t border-muted-teal/20" />
              <Link href="/members" onClick={() => setOsorterat(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">Members</Link>
              <Link href="/org" onClick={() => setOsorterat(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">Organisations</Link>
              <Link href="/skill" onClick={() => setOsorterat(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">Skills</Link>
              <Link href="/mentors" onClick={() => setOsorterat(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">Mentorer</Link>
              <div className="my-1 border-t border-muted-teal/20" />
              <Link href="/about" onClick={() => setOsorterat(false)} className="block px-4 py-2 text-dark-slate/70 hover:text-seagrass hover:bg-dry-sage/20">About</Link>
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
            <Link href="/projects" onClick={() => setOpen(false)} className="py-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Projects</Link>
            <Link href="/ideas" onClick={() => setOpen(false)} className="py-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Ideas</Link>
            <p className="pt-3 pb-1 text-xs font-semibold text-dark-slate/40 uppercase tracking-widest">Osorterat</p>
            <Link href="/feed" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Flöde</Link>
            <Link href="/dream-wall" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Drömväggen</Link>
            <Link href="/hall-of-impact" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Hall of Impact</Link>
            <Link href="/academy" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Academy</Link>
            {session?.user && (
              <Link href="/match" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Hitta projekt</Link>
            )}
            <Link href="/members" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Members</Link>
            <Link href="/org" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Organisations</Link>
            <Link href="/skill" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Skills</Link>
            <Link href="/mentors" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Mentorer</Link>
            <Link href="/about" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">About</Link>

            {session?.user ? (
              <>
                <p className="pt-3 pb-1 text-xs font-semibold text-dark-slate/40 uppercase tracking-widest">My account</p>
                <Link href="/workplace" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Workplace</Link>
                <Link href="/dashboard" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Dashboard</Link>
                <Link href="/profile" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Profile</Link>
                <Link href="/settings" onClick={() => setOpen(false)} className="py-2.5 pl-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Settings</Link>
                <Link href="/projects/new" onClick={() => setOpen(false)} className="py-3 text-coral font-semibold hover:text-watermelon border-b border-muted-teal/20">+ New project</Link>
                <button
                  onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }); }}
                  className="py-3 text-left text-dark-slate/50 hover:text-dark-slate text-sm"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="py-3 text-dark-slate/70 hover:text-seagrass border-b border-muted-teal/20">Log in</Link>
                <Link href="/signup" onClick={() => setOpen(false)} className="py-3 text-coral font-semibold hover:text-watermelon">Create account</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HelpCircle } from "lucide-react";

// Small "?" button used on workspace subpages to explain how the page
// works. Click-to-toggle (not hover-only) so it works on touch devices too.
// `moreHref`/`moreLabel` are optional, for pages (like Kanban) that also
// have a full Academy guide worth linking to for the deeper dive.
export default function HelpButton({
  text,
  label = "Hjälp",
  moreHref,
  moreLabel,
}: {
  text: string;
  label?: string;
  moreHref?: string;
  moreLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={label}
        className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
          open ? "border-coral text-coral" : "border-muted-teal/40 text-dark-slate/50 hover:border-coral hover:text-coral"
        }`}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-2 w-72 rounded-lg border border-muted-teal/30 bg-white p-4 text-sm leading-relaxed text-dark-slate/80 shadow-xl">
          <p className="whitespace-pre-line">{text}</p>
          {moreHref && (
            <Link href={moreHref} className="mt-3 inline-block text-sm font-medium text-coral hover:text-watermelon">
              {moreLabel} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

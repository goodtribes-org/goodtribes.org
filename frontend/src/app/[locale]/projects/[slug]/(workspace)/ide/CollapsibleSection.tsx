"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

// A folded Idé section: one row with the title and a short count until it's
// opened. The content stays in the page (just hidden), so a link to the
// section — #lean-canvas from "Börja här", Kritikern or anywhere else —
// can find it, open it and scroll there.
export default function CollapsibleSection({
  id,
  title,
  summary,
  children,
}: {
  id: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  const t = useTranslations("IdeaStart");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    function openFor(hash: string) {
      if (!hash || hash === "#") return;
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (!target || !ref.current?.contains(target)) return;
      setOpen(true);
      // Wait for the content to show, then scroll to it clear of the sticky
      // header (the same 6rem as the sections' scroll-mt-24).
      requestAnimationFrame(() =>
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 96, behavior: "smooth" }),
      );
    }
    // A click on a link to the hash we're already on fires no hashchange.
    function onClick(e: MouseEvent) {
      const link = (e.target as HTMLElement | null)?.closest?.("a[href^='#']");
      if (link) openFor(link.getAttribute("href") ?? "");
    }
    const onHash = () => openFor(window.location.hash);
    openFor(window.location.hash);
    window.addEventListener("hashchange", onHash);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <section ref={ref} id={id} className="scroll-mt-24">
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls={`${id}-content`}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-muted-teal/30 bg-white px-5 py-4 text-left hover:border-seagrass/50"
        >
          <span className="font-semibold text-dark-slate">{title}</span>
          <span className="text-sm text-dark-slate/60">
            {summary} <span aria-hidden>›</span>
          </span>
        </button>
      )}
      <div id={`${id}-content`} hidden={!open}>
        {children}
        <div data-fold className="mt-1 text-center">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-expanded={true}
            aria-controls={`${id}-content`}
            className="text-xs font-medium text-dark-slate/50 hover:text-dark-slate"
          >
            {t("fold")} ▴
          </button>
        </div>
      </div>
    </section>
  );
}

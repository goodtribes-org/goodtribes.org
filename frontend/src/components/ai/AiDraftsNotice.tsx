"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * "5 av 13 fält är AI-utkast som ingen i teamet gått igenom än" at the top of
 * a phase overview. "Visa dem" outlines every unreviewed draft on the page
 * (the [data-ai-draft] markers FieldProvenanceBadge renders) and scrolls to
 * the first; pressing again moves on to the next one. Nothing is hidden when
 * the count is zero — then there's simply nothing to say.
 */
export default function AiDraftsNotice({ drafts, filled }: { drafts: number; filled: number }) {
  const t = useTranslations("AiDraftsNotice");
  const [index, setIndex] = useState<number | null>(null);
  if (drafts === 0) return null;

  function show() {
    const els = [...document.querySelectorAll<HTMLElement>("[data-ai-draft]")];
    // Skip copies Next.js keeps hidden (a preserved previous view).
    const visible = els.filter((el) => el.offsetParent !== null);
    if (!visible.length) return;
    document.body.classList.add("review-ai-drafts");
    const next = index === null ? 0 : (index + 1) % visible.length;
    visible[next].scrollIntoView({ behavior: "smooth", block: "center" });
    setIndex(next);
  }

  function stop() {
    document.body.classList.remove("review-ai-drafts");
    setIndex(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-coral/30 bg-coral/5 px-4 py-2.5 text-sm text-dark-slate/80">
      <span>{t.rich("summary", { drafts, filled, b: (c) => <strong className="text-dark-slate">{c}</strong> })}</span>
      <button type="button" onClick={show} className="font-semibold text-coral hover:text-watermelon">
        {index === null ? t("show") : t("next")} →
      </button>
      {index !== null && (
        <button type="button" onClick={stop} className="text-xs text-dark-slate/50 hover:text-dark-slate">
          {t("stop")}
        </button>
      )}
    </div>
  );
}

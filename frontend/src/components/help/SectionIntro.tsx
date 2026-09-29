"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

// Short "how to do this" boxes per section, in the spirit of IdeaBuddy's
// per-section intros (docs/plans/fasframsteg-och-overblick.md, part 3):
// a title, two or three sentences and one tip, written for a non-profit
// initiativtagare. Closed per viewer and per section in localStorage — a
// per-viewer convenience, so every read/write is wrapped in try/catch and
// the page works without it. Shown by default until closed.

export type SectionIntroKey =
  | "about"
  | "sdg"
  | "leanCanvas"
  | "impactModel"
  | "valueProposition"
  | "marketScan"
  | "interviews"
  | "invite"
  | "gate"
  | "leanCanvasPage"
  | "customerModelPage"
  | "valuePropositionPage"
  | "impactModelPage";

const storageKey = (key: SectionIntroKey) => `sectionIntroClosed:${key}`;

function useIntroOpen(key: SectionIntroKey): [boolean | null, (open: boolean) => void] {
  // null until mounted, so the server render and first client render match
  // (no flash of a box that the viewer already closed).
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(storageKey(key)) !== "1");
    } catch {
      setOpen(true);
    }
  }, [key]);
  function set(next: boolean) {
    setOpen(next);
    try {
      if (next) window.localStorage.removeItem(storageKey(key));
      else window.localStorage.setItem(storageKey(key), "1");
    } catch {
      // private browsing etc. — the box just won't stay closed
    }
  }
  return [open, set];
}

function IntroBox({ introKey, onClose }: { introKey: SectionIntroKey; onClose: () => void }) {
  const t = useTranslations("SectionIntro");
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-seagrass/30 bg-seagrass/5 p-4 text-sm text-dark-slate/80">
      <span aria-hidden className="mt-0.5 text-seagrass">ⓘ</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-dark-slate">{t(`${introKey}.title`)}</p>
        <p className="mt-1">{t(`${introKey}.body`)}</p>
        <p className="mt-2 text-dark-slate/70">
          <span className="font-medium">💡 {t("tipLabel")}</span> {t(`${introKey}.tip`)}
        </p>
      </div>
      <button type="button" onClick={onClose} aria-label={t("close")} className="shrink-0 text-dark-slate/40 hover:text-dark-slate">
        ✕
      </button>
    </div>
  );
}

// A section's heading row (title, badge, action) with a "?" that reopens
// its intro box, and the box itself below the row. Used by OverviewSection.
export function SectionHeaderWithIntro({
  id,
  title,
  badge,
  action,
  introKey,
}: {
  id: string;
  title: string;
  badge?: string;
  action?: ReactNode;
  introKey: SectionIntroKey;
}) {
  const t = useTranslations("SectionIntro");
  const [open, setOpen] = useIntroOpen(introKey);
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 id={`${id}-heading`} className="text-lg font-semibold text-dark-slate">
            {title}
          </h2>
          {badge && <span className="rounded-full bg-coral/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-coral">{badge}</span>}
          {open === false && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={t("reopen")}
              title={t("reopen")}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-dark-slate/20 text-[11px] font-semibold text-dark-slate/50 hover:border-seagrass hover:text-seagrass"
            >
              ?
            </button>
          )}
        </div>
        {action}
      </div>
      {open && <IntroBox introKey={introKey} onClose={() => setOpen(false)} />}
    </>
  );
}

// Standalone box for pages that already have their own header (the canvas
// pages' WorkspacePageHeader, whose help button stays for the longer text).
// Once closed it stays closed; the page's help button is the way back.
export default function SectionIntro({ introKey }: { introKey: SectionIntroKey }) {
  const [open, setOpen] = useIntroOpen(introKey);
  if (!open) return null;
  return <IntroBox introKey={introKey} onClose={() => setOpen(false)} />;
}

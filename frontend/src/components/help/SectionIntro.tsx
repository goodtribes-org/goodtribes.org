"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { newHomeDisplayFont } from "@/components/ny-startsida/fonts";

// Short "how to do this" boxes per section, in the spirit of IdeaBuddy's
// per-section intros (docs/plans/fasframsteg-och-overblick.md, part 3):
// a title, two or three sentences and one tip, written for a non-profit
// initiativtagare. Closed by default (2026-10-03: shown open they took a lot
// of room and gave too much at once): the "?" next to a section's title opens
// it, and the help panel (bottom right) lists the same texts for the page.

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

function useIntroOpen(_key: SectionIntroKey): [boolean, (open: boolean) => void] {
  return useState(false);
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
      {/* The step's title is the page's title: centred, large, in the start
          page's display face, with the step arrows (portalled into the
          [data-nav] slots by PhaseSteps in focus mode) either side, and "?"
          plus the section's action (Granska, Öppna) at the right. */}
      <div className="mb-3 grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <span className="hidden sm:block" aria-hidden />
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center justify-center gap-2">
            <span data-nav="prev" className="contents" />
            <h2
              id={`${id}-heading`}
              className={`${newHomeDisplayFont.className} text-center text-3xl font-bold tracking-[-0.02em] text-dark-slate sm:text-4xl lg:text-[2.75rem] lg:leading-tight`}
            >
              {title}
            </h2>
            <span data-nav="next" className="contents" />
          </div>
        </div>
        {/* "?" with the actions, not in the title, so the title sits
            symmetrically between its arrows. */}
        <div className="flex items-center justify-center gap-3 sm:justify-end">
          <span data-nav="cards" className="contents" />
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={t("reopen")}
            title={t("reopen")}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold hover:border-seagrass hover:text-seagrass ${open ? "border-seagrass text-seagrass" : "border-dark-slate/20 text-dark-slate/50"}`}
          >
            ?
          </button>
          {action}
        </div>
      </div>
      {/* Under the row, not in the title's column, so "?" and the actions
          stay level with the title. */}
      {badge && (
        <div className="-mt-1 mb-3 flex justify-center">
          <span className="rounded-full bg-coral/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-coral">{badge}</span>
        </div>
      )}
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

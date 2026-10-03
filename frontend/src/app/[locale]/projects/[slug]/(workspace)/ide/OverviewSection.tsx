import type { ReactNode } from "react";
import type { FillState } from "@/lib/ideaFill";
import { SectionHeaderWithIntro, type SectionIntroKey } from "@/components/help/SectionIntro";
import CollapsibleSection from "./CollapsibleSection";

// One section of the Idé overview: a heading, an optional action (Edit,
// Manage …), an optional "how to do this" intro box (introKey — see
// components/help/SectionIntro.tsx), and either the content, a placeholder while the AI is still
// writing it, or a short note when the AI couldn't do it. With `folded` it
// starts as one row (title + that summary) that opens on click or on a link
// to it — see CollapsibleSection.
export default function OverviewSection({
  id,
  title,
  badge,
  action,
  after,
  fill,
  writingLabel,
  failedNote,
  introKey,
  folded,
  bare = false,
  children,
}: {
  id: string;
  title: string;
  badge?: string;
  action?: ReactNode;
  // Under the white frame, e.g. an AI button (same place as the canvases' review box).
  after?: ReactNode;
  fill?: FillState;
  writingLabel: string;
  failedNote?: ReactNode;
  introKey?: SectionIntroKey;
  folded?: { summary: string };
  // Without the white frame, for the big canvases (Lean Canvas, värdeerbjudande,
  // impactmodell): their own blocks are already boxes, so the frame only took
  // width from them.
  bare?: boolean;
  children: ReactNode;
}) {
  const writing = fill === "pending" || fill === "running";
  const headerOutside = !!introKey;
  const framed = !bare && !headerOutside;
  const section = (
    <section id={folded ? undefined : id} aria-labelledby={`${id}-heading`} className={framed ? "scroll-mt-24 rounded-2xl border border-muted-teal/30 bg-white p-5" : "scroll-mt-24"}>
      {introKey ? (
        <SectionHeaderWithIntro id={id} title={title} badge={badge} action={writing ? undefined : action} introKey={introKey} />
      ) : (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 id={`${id}-heading`} className="text-lg font-semibold text-dark-slate">
              {title}
            </h2>
            {badge && (
              <span className="rounded-full bg-coral/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-coral">{badge}</span>
            )}
          </div>
          {!writing && action}
        </div>
      )}
      {/* With the big step title, the title row sits above the white
          frame (same as the canvases) and the frame holds only the content. */}
      <div className={headerOutside && !bare ? "rounded-3xl border border-dark-slate/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.15)] sm:p-8" : undefined}>
      {writing ? (
        <div aria-live="polite" className="flex flex-col gap-2">
          <p className="text-sm text-dark-slate/60">{writingLabel}</p>
          <div className="h-3 w-3/4 animate-pulse rounded bg-dry-sage/40" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-dry-sage/40" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-dry-sage/40" />
        </div>
      ) : fill === "failed" && failedNote ? (
        <>
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{failedNote}</p>
          {children}
        </>
      ) : (
        children
      )}
      </div>
      {!writing && after}
    </section>
  );
  return folded ? (
    <CollapsibleSection id={id} title={title} summary={folded.summary}>
      {section}
    </CollapsibleSection>
  ) : (
    section
  );
}

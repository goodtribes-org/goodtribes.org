import type { ReactNode } from "react";
import type { FillState } from "@/lib/ideaFill";

// One section of the Idé overview: a heading, an optional action (Edit,
// Manage …), and either the content, a placeholder while the AI is still
// writing it, or a short note when the AI couldn't do it.
export default function OverviewSection({
  id,
  title,
  badge,
  action,
  fill,
  writingLabel,
  failedNote,
  children,
}: {
  id: string;
  title: string;
  badge?: string;
  action?: ReactNode;
  fill?: FillState;
  writingLabel: string;
  failedNote?: ReactNode;
  children: ReactNode;
}) {
  const writing = fill === "pending" || fill === "running";
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24 rounded-2xl border border-muted-teal/30 bg-white p-5">
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
    </section>
  );
}

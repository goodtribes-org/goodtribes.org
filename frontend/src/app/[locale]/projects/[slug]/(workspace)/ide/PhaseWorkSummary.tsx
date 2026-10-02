"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { COLUMN_LABEL_KEYS } from "@/lib/kanbanColumns";
import type { PhaseWork } from "@/lib/phaseWork";

export type GateWork = Omit<PhaseWork, "openCards"> & {
  openCards: (PhaseWork["openCards"][number] & { stepLabel: string | null })[];
};

// The work behind the phase, at the gate: how many of the phase's cards
// are done and which are still open. Information for the decision — open
// work never blocks going ahead, it's recorded with the decision.
export default function PhaseWorkSummary({ slug, work }: { slug: string; work: GateWork }) {
  const t = useTranslations("PhaseGate");
  const tShared = useTranslations("KanbanShared");
  const total = work.done + work.open;
  const more = work.open - work.openCards.length;

  return (
    <div className="rounded-xl border border-muted-teal/40 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-dark-slate">{t("workHeading")}</h3>
        <Link href={`/projects/${slug}/tasks`} className="text-xs font-medium text-seagrass hover:underline">
          {t("workBoardLink")}
        </Link>
      </div>

      {total === 0 ? (
        // Cards still on the wishlist are tied to the phase too — the line
        // below counts them, so don't also claim there are none.
        <p className="mt-2 text-dark-slate/60">{t(work.wishlist > 0 ? "workNoneStarted" : "workNone")}</p>
      ) : (
        <>
          <p className="mt-2 text-dark-slate/80">{t("workDone", { done: work.done, total })}</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-dark-slate/10" aria-hidden>
            <div className="h-full rounded-full bg-seagrass" style={{ width: `${Math.round((work.done / total) * 100)}%` }} />
          </div>
          {work.openCards.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1">
              {work.openCards.map((c) => (
                <li key={c.id} className="flex flex-wrap items-baseline gap-x-2 text-dark-slate/75">
                  <span aria-hidden className="text-dark-slate/30">○</span>
                  <span>{c.title}</span>
                  <span className="text-xs text-dark-slate/45">
                    {[c.stepLabel, COLUMN_LABEL_KEYS[c.column] ? tShared(COLUMN_LABEL_KEYS[c.column]) : c.column].filter(Boolean).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {more > 0 && <p className="mt-1 text-xs text-dark-slate/50">{t("workMore", { count: more })}</p>}
        </>
      )}

      {(work.wishlist > 0 || work.earlierOpen > 0 || work.untagged > 0) && (
        <ul className="mt-3 flex flex-col gap-0.5 text-xs text-dark-slate/55">
          {work.earlierOpen > 0 && <li>{t("workEarlierOpen", { count: work.earlierOpen })}</li>}
          {work.wishlist > 0 && <li>{t("workWishlist", { count: work.wishlist })}</li>}
          {work.untagged > 0 && <li>{t("workUntagged", { count: work.untagged })}</li>}
        </ul>
      )}
    </div>
  );
}

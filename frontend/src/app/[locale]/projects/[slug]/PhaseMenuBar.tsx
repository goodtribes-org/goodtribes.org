"use client";

import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toggleChecklistItem } from "./(workspace)/edit/actions";
import { DISPLAY_PHASES, toDisplayPhase, getChecklistForPhase, type ProjectPhaseValue } from "@/lib/projectPhase";

// Numbers a phase's checklist ("2.3", "2.3.1", "4.3", "4.3.2", …) from a
// running top-level/sub-level counter. An item with `parentKey` set is a
// sub-step of the item immediately before it that lacks one — it gets the
// parent's top-level number with a sub-number appended, instead of its own
// top-level number. Source order defines the grouping, same as the data in
// INITIATIVE_CHECKLIST_ITEMS itself (see lib/projectPhase.ts).
function numberChecklist(items: { key: string; parentKey?: string }[], phaseNumber: number): string[] {
  let topLevel = 0;
  let sub = 0;
  return items.map((item) => {
    if (item.parentKey) {
      sub += 1;
      return `${phaseNumber}.${topLevel}.${sub}`;
    }
    topLevel += 1;
    sub = 0;
    return `${phaseNumber}.${topLevel}`;
  });
}

interface Props {
  slug: string;
  phase: ProjectPhaseValue;
  completedKeys: string[];
  canEdit: boolean;
  // Set on guide pages so the pill for the guide being read gets a ring —
  // independent of `phase` (the project's actual current phase, still shown
  // via the solid fill), since a guide can be opened for any phase.
  viewingPhase?: ProjectPhaseValue;
}

// Fas- och stegmeny (PRD 4d) — en platt meny under hero, "1. Idé", "2. Pilot"
// osv. Idé täcker både IDEA och SPRINT (se lib/projectPhase.ts — sammanslaget
// på UI-nivå, inget separat "Sprint"-steg längre). Varje fas har en
// checklista och går att klicka på för att fälla ut en undermeny med
// numrerade delsteg ("1.1 Beskriv idén", "1.2 ...").
export default function PhaseMenuBar({ slug, phase, completedKeys, canEdit, viewingPhase }: Props) {
  const t = useTranslations("PhaseMenuBar");
  const tPhase = useTranslations("ProjectPhase");
  const tChecklist = useTranslations("ProjectPhaseChecklist");
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set(completedKeys));
  const [isPending, startTransition] = useTransition();
  const [openPhase, setOpenPhase] = useState<ProjectPhaseValue | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Guide pages render their own step UI alongside this menu — when a step
  // gets marked done there, the server action revalidates this route too,
  // so pick up the fresh completedKeys instead of staying stuck on the set
  // this component first mounted with.
  useEffect(() => {
    setDoneKeys(new Set(completedKeys));
  }, [completedKeys]);

  const displayPhase = toDisplayPhase(phase);
  const currentIndex = DISPLAY_PHASES.findIndex((p) => p.value === displayPhase);
  const viewingDisplayPhase = viewingPhase ? toDisplayPhase(viewingPhase) : null;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenPhase(null);
    }
    if (openPhase) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openPhase]);

  function handleToggle(p: ProjectPhaseValue, itemKey: string, done: boolean) {
    if (!canEdit) return;
    setDoneKeys((prev) => {
      const next = new Set(prev);
      if (done) next.add(itemKey); else next.delete(itemKey);
      return next;
    });
    startTransition(() => toggleChecklistItem(slug, p, itemKey, done));
  }

  // Klar-andel per fas — driver linjen som kommer efter fasens ord (t.ex.
  // 3 av 4 punkter klara = linjen är 75% grön, 25% grå). Beräknas för alla
  // faser i förväg eftersom linjen framför fas i visar fas i-1:s andel.
  const phaseProgress = DISPLAY_PHASES.map((p) => {
    const items = getChecklistForPhase(p.value) ?? [];
    const done = items.filter((item) => doneKeys.has(item.key)).length;
    const total = items.length;
    return { total, pct: total > 0 ? Math.round((done / total) * 100) : 0, complete: total > 0 && done === total };
  });

  return (
    <div ref={menuRef}>
      <nav className="flex flex-wrap sm:flex-nowrap items-center gap-y-3 text-sm w-full">
        {DISPLAY_PHASES.map((p, i) => {
          const isCurrent = i === currentIndex;
          const isPast = i < currentIndex;
          const isReached = i <= currentIndex;
          const isViewing = p.value === viewingDisplayPhase;
          const checklist = getChecklistForPhase(p.value);
          const itemNumbers = checklist ? numberChecklist(checklist, i + 1) : [];
          const isOpen = openPhase === p.value;
          const canEditThis = canEdit;

          // När en fas egen checklista är 100% klar blir dess prick och namn
          // gröna — oavsett om fasen faktiskt är aktiv än. Utöver det tänds
          // NÄSTA fas i förskott (prick grön, namn svart) — men bara om ALLA
          // faser fram till och med denna är helt klara, inte bara den
          // närmast föregående.
          const isOwnPhaseComplete = phaseProgress[i].complete;
          const unlockedByPrevPhase = i > 0 && phaseProgress.slice(0, i).every((pp) => pp.complete);
          const dotIsGreen = isReached || unlockedByPrevPhase || isOwnPhaseComplete;

          const labelClass = isOwnPhaseComplete
            ? "text-seagrass font-bold"
            : unlockedByPrevPhase
              ? "text-black font-bold"
              : isCurrent
                ? "text-dark-slate font-bold"
                : isPast
                  ? "text-seagrass/70 font-semibold hover:text-seagrass"
                  : "text-dark-slate/35 font-semibold hover:text-dark-slate/60";

          const itemContent = (
            <>
              <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 border transition-colors mr-1.5 ${
                  dotIsGreen ? "bg-seagrass border-seagrass" : "bg-white border-dark-slate/25"
                }`}
                aria-hidden="true"
              />
              <span className={`uppercase tracking-wide text-xs transition-colors ${labelClass}`}>{tPhase(p.value)}</span>
              <svg
                className={`w-3 h-3 flex-shrink-0 opacity-50 transition-transform ${isOpen ? "rotate-180" : ""} ${
                  isOwnPhaseComplete
                    ? "text-seagrass"
                    : unlockedByPrevPhase
                      ? "text-black"
                      : isCurrent
                        ? "text-dark-slate"
                        : isPast
                          ? "text-seagrass/70"
                          : "text-dark-slate/35"
                }`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          );

          return (
            <Fragment key={p.value}>
              {i > 0 && (
                <div
                  className="hidden sm:block flex-1 h-0.5 mx-1 rounded-full"
                  style={{
                    background: `linear-gradient(to right, var(--color-seagrass) ${phaseProgress[i - 1].pct}%, color-mix(in srgb, var(--color-dark-slate) 20%, transparent) ${phaseProgress[i - 1].pct}% 100%)`,
                  }}
                  aria-hidden="true"
                />
              )}
              <div className="relative z-10 flex items-center shrink-0">
                {checklist ? (
                  <button
                    type="button"
                    onClick={() => setOpenPhase((prev) => (prev === p.value ? null : p.value))}
                    aria-expanded={isOpen}
                    aria-current={isViewing ? "step" : undefined}
                    className="flex items-center px-1.5 py-1 rounded-full transition-colors"
                  >
                    {itemContent}
                  </button>
                ) : (
                  <span aria-current={isViewing ? "step" : undefined} className="flex items-center px-1.5 py-1">
                    {itemContent}
                  </span>
                )}

              {isOpen && checklist && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-muted-teal/20 rounded-xl shadow-lg z-20 overflow-hidden animate-[fadeIn_0.12s_ease-out]">
                  <a
                    href={p.value === "IDEA" ? `/projects/${slug}/guide` : `/projects/${slug}/guide/${p.value.toLowerCase()}`}
                    className="block px-3.5 pt-3 pb-2 text-xs font-semibold text-dark-slate/40 uppercase tracking-wide border-b border-muted-teal/10 hover:text-seagrass transition-colors"
                  >
                    {t("guideLinkLabel", { phase: tPhase(p.value) })}
                  </a>
                  <div className="py-1">
                    {checklist.map((item, j) => {
                      const done = doneKeys.has(item.key);
                      return (
                        <div key={item.key} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-seagrass/5 transition-colors">
                          <button
                            type="button"
                            disabled={isPending || !canEditThis}
                            onClick={() => handleToggle(p.value, item.key, !done)}
                            aria-checked={done}
                            role="checkbox"
                            className={`w-4 h-4 rounded-[4px] flex items-center justify-center flex-shrink-0 transition-colors ${
                              done ? "bg-seagrass" : "border border-muted-teal/50 bg-white"
                            } ${canEditThis ? "" : "cursor-default"}`}
                          >
                            {done && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <span className={`text-sm ${done ? "text-dark-slate/30 line-through" : "text-dark-slate/80"}`}>
                            <span className={`font-medium ${done ? "text-dark-slate/30 line-through" : "text-dark-slate/40"}`}>
                              {itemNumbers[j]}
                            </span>{" "}
                            <a
                              href={
                                item.href
                                  ? `/projects/${slug}/${item.href}`
                                  : p.value === "IDEA"
                                    ? `/projects/${slug}/guide?step=${item.key}`
                                    : `/projects/${slug}/guide/${p.value.toLowerCase()}?step=${item.key}`
                              }
                              className={`hover:underline ${done ? "text-dark-slate/30 line-through" : ""}`}
                            >
                              {tChecklist(item.key)}
                            </a>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              </div>
            </Fragment>
          );
        })}
        {/* Mållinje efter Impact — andelsfärgad som mellan faserna, men i
            orange, avslutat med en orange prick (samma storlek som fasernas)
            som markerar målet bortom Impact. Pricken är bara ihålig med
            orange kant tills Impacts checklista är 100% klar, då fylls
            den helt. */}
        <div
          className="hidden sm:block flex-1 h-0.5 mx-1 rounded-full"
          style={{
            background: `linear-gradient(to right, #f97316 ${phaseProgress[phaseProgress.length - 1].pct}%, color-mix(in srgb, var(--color-dark-slate) 20%, transparent) ${phaseProgress[phaseProgress.length - 1].pct}% 100%)`,
          }}
          aria-hidden="true"
        />
        <span
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 border ${
            phaseProgress[phaseProgress.length - 1].complete ? "bg-orange-500 border-orange-500" : "bg-white border-orange-500"
          }`}
          aria-hidden="true"
        />
      </nav>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toggleChecklistItem } from "./(workspace)/edit/actions";
import { DISPLAY_PHASES, toDisplayPhase, getChecklistForPhase, INITIATIVE_CHECKLIST_ITEMS, type ProjectPhaseValue } from "@/lib/projectPhase";

// getChecklistForPhase("IDEA") appends SPRINT's items after IDEA's own —
// those SPRINT items are the same 5 sub-tasks shown inside item 1.5
// ("Sprint") in the guide, so they're numbered as its sub-steps (1.5.1…)
// instead of continuing the flat 1.6, 1.7… sequence.
const IDEA_TOP_LEVEL_COUNT = INITIATIVE_CHECKLIST_ITEMS.IDEA.length;

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
    if (!canEdit || p !== displayPhase) return;
    setDoneKeys((prev) => {
      const next = new Set(prev);
      if (done) next.add(itemKey); else next.delete(itemKey);
      return next;
    });
    startTransition(() => toggleChecklistItem(slug, p, itemKey, done));
  }

  return (
    <div ref={menuRef}>
      <nav className="relative flex flex-wrap items-center justify-center gap-5 text-sm w-fit mx-auto">
        {/* Linje mellan faserna, samma mönster som stegen på startsidan — pillren (bg-white/bg-seagrass) döljer linjen där de sitter. Grön fram till uppnådd fas, grå därefter. */}
        <div
          className="hidden sm:flex absolute left-0 right-0"
          style={{ top: "50%", transform: "translateY(-50%)" }}
          aria-hidden="true"
        >
          {DISPLAY_PHASES.slice(1).map((_, i) => (
            <div
              key={i}
              className={`flex-1 border-t-2 border-dashed ${i < currentIndex ? "border-seagrass/60" : "border-dark-slate/20"}`}
            />
          ))}
        </div>
        {DISPLAY_PHASES.map((p, i) => {
          const isCurrent = i === currentIndex;
          const isPast = i < currentIndex;
          const isViewing = p.value === viewingDisplayPhase;
          const checklist = getChecklistForPhase(p.value);
          const isOpen = openPhase === p.value;
          const canEditThis = canEdit && p.value === displayPhase;

          const pillClass = isCurrent
            ? "bg-seagrass text-white font-bold shadow-sm"
            : isPast
              ? "bg-white border border-seagrass/60 text-seagrass/80 hover:border-seagrass hover:text-seagrass"
              : isViewing
                ? "bg-white border-2 border-seagrass/40 text-dark-slate/35 hover:border-seagrass/60 hover:text-dark-slate/60"
                : "bg-white border border-dark-slate/15 text-dark-slate/35 hover:border-dark-slate/30 hover:text-dark-slate/60";

          return (
            <div key={p.value} className="relative z-10 flex items-center">
              {checklist ? (
                <button
                  type="button"
                  onClick={() => setOpenPhase((prev) => (prev === p.value ? null : p.value))}
                  aria-expanded={isOpen}
                  aria-current={isViewing ? "step" : undefined}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors ${pillClass} ${
                    isOpen ? "ring-2 ring-seagrass/30" : ""
                  }`}
                >
                  {i + 1}. {p.label}
                  <svg
                    className={`w-3 h-3 opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              ) : (
                <span aria-current={isViewing ? "step" : undefined} className={`px-3 py-1.5 rounded-full inline-block transition-colors ${pillClass}`}>
                  {i + 1}. {p.label}
                </span>
              )}

              {isOpen && checklist && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-muted-teal/20 rounded-xl shadow-lg z-20 overflow-hidden animate-[fadeIn_0.12s_ease-out]">
                  <a
                    href={p.value === "IDEA" ? `/projects/${slug}/guide` : `/projects/${slug}/guide/${p.value.toLowerCase()}`}
                    className="block px-3.5 pt-3 pb-2 text-xs font-semibold text-dark-slate/40 uppercase tracking-wide border-b border-muted-teal/10 hover:text-seagrass transition-colors"
                  >
                    {p.label} guiden
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
                            <span className="text-dark-slate/40 font-medium">
                              {p.value === "IDEA" && j >= IDEA_TOP_LEVEL_COUNT
                                ? `${i + 1}.${IDEA_TOP_LEVEL_COUNT}.${j - IDEA_TOP_LEVEL_COUNT + 1}`
                                : `${i + 1}.${j + 1}`}
                            </span>{" "}
                            {item.href ? (
                              <a href={`/projects/${slug}/${item.href}`} className="hover:underline">{item.label}</a>
                            ) : (
                              item.label
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

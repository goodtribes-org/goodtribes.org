"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toggleChecklistItem } from "./(workspace)/edit/actions";
import { PROJECT_PHASES, INITIATIVE_CHECKLIST_ITEMS, type ProjectPhaseValue } from "@/lib/projectPhase";

interface Props {
  slug: string;
  phase: ProjectPhaseValue;
  completedKeys: string[];
  canEdit: boolean;
}

function getChecklistFor(p: ProjectPhaseValue) {
  return INITIATIVE_CHECKLIST_ITEMS[p] ?? null;
}

// Fas- och stegmeny (PRD 4d) — en platt meny under hero, "1. Idé", "2. Sprint" osv.
// Varje fas har en checklista och går att klicka på för att fälla ut en
// undermeny med numrerade delsteg ("1.1 Beskriv idén", "1.2 ...").
export default function PhaseMenuBar({ slug, phase, completedKeys, canEdit }: Props) {
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set(completedKeys));
  const [isPending, startTransition] = useTransition();
  const [openPhase, setOpenPhase] = useState<ProjectPhaseValue | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentIndex = PROJECT_PHASES.findIndex((p) => p.value === phase);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenPhase(null);
    }
    if (openPhase) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openPhase]);

  function handleToggle(p: ProjectPhaseValue, itemKey: string, done: boolean) {
    if (!canEdit || p !== phase) return;
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
          {PROJECT_PHASES.slice(1).map((_, i) => (
            <div
              key={i}
              className={`flex-1 border-t-2 border-dashed ${i < currentIndex ? "border-seagrass/60" : "border-dark-slate/20"}`}
            />
          ))}
        </div>
        {PROJECT_PHASES.map((p, i) => {
          const isCurrent = i === currentIndex;
          const isPast = i < currentIndex;
          const checklist = getChecklistFor(p.value);
          const isOpen = openPhase === p.value;
          const canEditThis = canEdit && p.value === phase;

          const pillClass = isCurrent
            ? "bg-seagrass text-white font-bold shadow-sm"
            : isPast
              ? "bg-white border border-seagrass/60 text-seagrass/80 hover:border-seagrass hover:text-seagrass"
              : "bg-white border border-dark-slate/15 text-dark-slate/35 hover:border-dark-slate/30 hover:text-dark-slate/60";

          return (
            <div key={p.value} className="relative z-10 flex items-center">
              {checklist ? (
                <button
                  type="button"
                  onClick={() => setOpenPhase((prev) => (prev === p.value ? null : p.value))}
                  aria-expanded={isOpen}
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
                <span className={`px-3 py-1.5 rounded-full inline-block transition-colors ${pillClass}`}>
                  {i + 1}. {p.label}
                </span>
              )}

              {isOpen && checklist && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-muted-teal/20 rounded-xl shadow-lg z-20 overflow-hidden animate-[fadeIn_0.12s_ease-out]">
                  <p className="px-3.5 pt-3 pb-2 text-xs font-semibold text-dark-slate/40 uppercase tracking-wide border-b border-muted-teal/10">
                    {p.label}
                  </p>
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
                            <span className="text-dark-slate/40 font-medium">{i + 1}.{j + 1}</span>{" "}
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

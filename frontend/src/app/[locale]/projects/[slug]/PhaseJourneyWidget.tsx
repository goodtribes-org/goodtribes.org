"use client";

import { useState, useTransition } from "react";
import { toggleChecklistItem } from "./(workspace)/edit/actions";
import { PROJECT_PHASES, INITIATIVE_CHECKLIST_ITEMS, type ProjectPhaseValue } from "@/lib/projectPhase";

interface Props {
  slug: string;
  phase: ProjectPhaseValue;
  completedKeys: string[];
  canEdit: boolean;
}

function getChecklistFor(p: ProjectPhaseValue) {
  return p === "IDEA" || p === "SPRINT" ? INITIATIVE_CHECKLIST_ITEMS[p] : null;
}

// Fas- och stegwidget (PRD 4d) — en egen inramad widget under hero. Alla faser
// med checklista (idé/sprint) går att klicka på för att se sina delsteg; bara
// den faktiska aktuella fasen går att bocka av, övriga är read-only.
export default function PhaseJourneyWidget({ slug, phase, completedKeys, canEdit }: Props) {
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set(completedKeys));
  const [isPending, startTransition] = useTransition();
  const [expandedPhase, setExpandedPhase] = useState<ProjectPhaseValue | null>(phase);

  const currentIndex = PROJECT_PHASES.findIndex((p) => p.value === phase);

  function handleToggle(itemKey: string, done: boolean) {
    if (!canEdit || expandedPhase !== phase) return;
    setDoneKeys((prev) => {
      const next = new Set(prev);
      if (done) next.add(itemKey); else next.delete(itemKey);
      return next;
    });
    startTransition(() => toggleChecklistItem(slug, phase as "IDEA" | "SPRINT", itemKey, done));
  }

  function handlePhaseClick(p: ProjectPhaseValue) {
    if (!getChecklistFor(p)) return;
    setExpandedPhase((prev) => (prev === p ? null : p));
  }

  return (
    <section className="border border-muted-teal/30 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-dark-slate mb-3">Projektfaser</h2>
      <div className="flex flex-col">
        {PROJECT_PHASES.map((p, i) => {
          const isCurrent = i === currentIndex;
          const isPast = i < currentIndex;
          const checklist = getChecklistFor(p.value);
          const isExpanded = expandedPhase === p.value;
          const canEditThis = canEdit && p.value === phase;

          const rowClass = `flex items-center gap-2 py-1.5 w-full text-left transition-colors ${
            checklist ? "hover:bg-dark-slate/5 rounded-lg px-1.5 -mx-1.5" : ""
          }`;

          const row = (
            <>
              <span className={`text-xs font-bold w-4 text-center shrink-0 ${
                isCurrent ? "text-seagrass" : isPast ? "text-seagrass/60" : "text-dark-slate/30"
              }`}>
                {i + 1}
              </span>
              <span className={`text-sm flex-1 ${
                isCurrent ? "font-bold text-seagrass" : isPast ? "text-seagrass/70" : "text-dark-slate/35"
              }`}>
                {p.label}
              </span>
              {isPast && (
                <svg className="w-3.5 h-3.5 text-seagrass/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {checklist && (
                <svg
                  className={`w-3 h-3 shrink-0 opacity-50 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </>
          );

          return (
            <div key={p.value}>
              {checklist ? (
                <button type="button" onClick={() => handlePhaseClick(p.value)} aria-expanded={isExpanded} className={rowClass}>
                  {row}
                </button>
              ) : (
                <div className={rowClass}>{row}</div>
              )}

              {isExpanded && checklist && (
                <ul className="pl-9 pb-2 flex flex-col gap-1.5">
                  {checklist.map((item) => {
                    const done = doneKeys.has(item.key);
                    return (
                      <li key={item.key} className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isPending || !canEditThis}
                          onClick={() => handleToggle(item.key, !done)}
                          aria-checked={done}
                          role="checkbox"
                          className={`w-[15px] h-[15px] rounded-[3px] flex items-center justify-center flex-shrink-0 transition-colors ${
                            done ? "bg-seagrass" : "border border-muted-teal/50 bg-white"
                          } ${canEditThis ? "" : "cursor-default"}`}
                        >
                          {done && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <span className={`text-[13px] ${done ? "text-dark-slate/30 line-through" : "text-dark-slate/70"}`}>
                          {item.href ? (
                            <a href={`/projects/${slug}/${item.href}`} className="hover:underline">{item.label}</a>
                          ) : (
                            item.label
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

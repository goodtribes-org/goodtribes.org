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

// Fas- och stegwidget (PRD 4d) — the full seven-phase journey, visible to
// every visitor, each phase numbered 1-7. Only phases with a checklist
// (currently idea/sprint) are clickable, expanding their delsteg directly
// beneath that phase (between it and the next one). Only the project's
// actual current phase's items can be toggled — the project lead (canEdit)
// checks them off, everyone else sees read-only ticks so nothing looks
// clickable-but-broken.
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
      <h2 className="text-sm font-semibold text-dark-slate mb-4">Projektfaser</h2>
      <ol className="flex flex-col">
        {PROJECT_PHASES.map((p, i) => {
          const isCurrent = i === currentIndex;
          const isPast = i < currentIndex;
          const isLast = i === PROJECT_PHASES.length - 1;
          const hasChecklist = !!getChecklistFor(p.value);
          const isExpanded = expandedPhase === p.value;
          const checklist = getChecklistFor(p.value);
          const canEditThis = canEdit && p.value === phase;

          const numberColor = isCurrent ? "text-seagrass" : isPast ? "text-dark-slate/50" : "text-dark-slate/30";
          const labelColor = isCurrent ? "font-bold text-seagrass" : isPast ? "text-dark-slate/50" : "text-dark-slate/30";

          return (
            <li key={p.value} className="flex gap-3">
              <div className="flex flex-col items-center w-5 flex-shrink-0">
                <span className={`text-sm font-bold tabular-nums leading-none pt-0.5 ${numberColor}`}>{i + 1}</span>
                {!isLast && <div className="w-px flex-1 bg-muted-teal/25 mt-1.5" />}
              </div>

              <div className="flex-1 min-w-0 pb-2">
                {hasChecklist ? (
                  <button
                    type="button"
                    onClick={() => handlePhaseClick(p.value)}
                    aria-expanded={isExpanded}
                    className="flex items-center gap-1.5 group"
                  >
                    <span className={`text-sm ${labelColor}`}>{p.label}</span>
                    <svg
                      className={`w-3 h-3 text-dark-slate/30 transition-transform group-hover:text-dark-slate/50 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                ) : (
                  <span className={`text-sm ${labelColor}`}>{p.label}</span>
                )}

                {isExpanded && checklist && (
                  <ul className="flex flex-col gap-2 mt-3">
                    {checklist.map((item) => {
                      const done = doneKeys.has(item.key);
                      return (
                        <li key={item.key} className="flex items-center gap-2.5">
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
                          <span className={`text-[13px] ${done ? "text-dark-slate/30 line-through" : "text-dark-slate/50"}`}>
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
            </li>
          );
        })}
      </ol>
    </section>
  );
}

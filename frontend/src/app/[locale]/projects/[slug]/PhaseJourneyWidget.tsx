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

// Fas- och stegwidget (PRD 4d) — the full seven-phase journey, visible to
// every visitor. Only the idea/project phases have a checklist today; only
// leads (canEdit) can actually toggle items, everyone else sees read-only
// ticks so nothing looks clickable-but-broken.
export default function PhaseJourneyWidget({ slug, phase, completedKeys, canEdit }: Props) {
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set(completedKeys));
  const [isPending, startTransition] = useTransition();

  const currentIndex = PROJECT_PHASES.findIndex((p) => p.value === phase);
  const checklist = phase === "IDEA" || phase === "PROJECT" ? INITIATIVE_CHECKLIST_ITEMS[phase] : null;

  function handleToggle(itemKey: string, done: boolean) {
    if (!canEdit || !checklist) return;
    setDoneKeys((prev) => {
      const next = new Set(prev);
      if (done) next.add(itemKey); else next.delete(itemKey);
      return next;
    });
    startTransition(() => toggleChecklistItem(slug, phase as "IDEA" | "PROJECT", itemKey, done));
  }

  return (
    <section className="border border-muted-teal/30 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-dark-slate mb-3">Resa</h2>
      <ol className="flex flex-col gap-2">
        {PROJECT_PHASES.map((p, i) => {
          const isCurrent = i === currentIndex;
          const isPast = i < currentIndex;
          return (
            <li key={p.value} className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  isCurrent ? "bg-seagrass" : isPast ? "bg-dry-sage" : "bg-gray-200"
                }`}
              />
              <span className={`text-xs ${
                isCurrent ? "font-semibold text-dark-slate" : isPast ? "text-dark-slate/50" : "text-dark-slate/30"
              }`}>
                {p.label}
              </span>
            </li>
          );
        })}
      </ol>

      {checklist && (
        <div className="mt-4 pt-4 border-t border-muted-teal/20">
          <p className="text-xs font-medium text-dark-slate/70 mb-2">Delsteg</p>
          <ul className="flex flex-col gap-2">
            {checklist.map((item, i) => {
              const done = doneKeys.has(item.key);
              return (
                <li key={item.key} className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isPending || !canEdit}
                    onClick={() => handleToggle(item.key, !done)}
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                      done ? "bg-seagrass text-white" : "border border-muted-teal/40 text-dark-slate/30"
                    } ${canEdit ? "" : "cursor-default"}`}
                  >
                    {done ? "✓" : i + 1}
                  </button>
                  <span className={`text-xs ${done ? "text-dark-slate/40 line-through" : "text-dark-slate/80"}`}>
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
        </div>
      )}
    </section>
  );
}

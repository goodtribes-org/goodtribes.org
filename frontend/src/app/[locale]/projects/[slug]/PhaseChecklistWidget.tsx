"use client";

import { useEffect, useState, useTransition, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { toggleChecklistItem } from "./(workspace)/edit/actions";
import { getChecklistForPhase, PHASE_COLORS, hexToRgba, type ProjectPhaseValue } from "@/lib/projectPhase";

interface Props {
  slug: string;
  phase: ProjectPhaseValue;
  completedKeys: string[];
  canEdit: boolean;
}

// Sidebar counterpart to PhaseMenuBar's popover checklist — same underlying
// InitiativeChecklistItem rows and toggleChecklistItem action, just always
// visible for the project's current phase instead of tucked behind a click.
// Styled as "Din fasresa" so it visually pairs with the phase arrows above
// (same per-phase color from PHASE_COLORS), instead of a generic
// "Checklista: {phase}" label.
export default function PhaseChecklistWidget({ slug, phase, completedKeys, canEdit }: Props) {
  const tPhase = useTranslations("ProjectPhase");
  const tWidget = useTranslations("PhaseChecklistWidget");
  const tChecklist = useTranslations("ProjectPhaseChecklist");
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set(completedKeys));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDoneKeys(new Set(completedKeys));
  }, [completedKeys]);

  const checklist = getChecklistForPhase(phase);
  if (!checklist || checklist.length === 0) return null;

  const doneCount = checklist.filter((item) => doneKeys.has(item.key)).length;
  const pct = Math.round((doneCount / checklist.length) * 100);
  const phaseColor = PHASE_COLORS[phase];
  const barStyle = { "--phase-color-full": phaseColor } as CSSProperties;

  function handleToggle(itemKey: string, done: boolean) {
    if (!canEdit) return;
    setDoneKeys((prev) => {
      const next = new Set(prev);
      if (done) next.add(itemKey);
      else next.delete(itemKey);
      return next;
    });
    startTransition(() => toggleChecklistItem(slug, phase, itemKey, done));
  }

  return (
    <section className="bg-white border border-muted-teal/30 rounded-xl p-4">
      <h2 className="text-sm font-bold text-dark-slate">{tWidget("heading")}</h2>
      <div className="flex items-center justify-between mt-1 mb-2">
        <span className="text-xs font-medium" style={{ color: phaseColor }}>
          {tWidget("phaseProgress", { phase: tPhase(phase), done: doneCount, total: checklist.length })}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted-teal/15 overflow-hidden mb-3" style={barStyle}>
        <div
          className="h-full rounded-full bg-[color:var(--phase-color-full)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
        {checklist.map((item) => {
          const done = doneKeys.has(item.key);
          return (
            <label
              key={item.key}
              className={`flex items-start gap-2 ${canEdit ? "cursor-pointer" : "cursor-default"}`}
            >
              <input
                type="checkbox"
                checked={done}
                disabled={isPending || !canEdit}
                onChange={(e) => handleToggle(item.key, e.target.checked)}
                className="accent-seagrass w-4 h-4 mt-0.5 flex-shrink-0"
              />
              <span className={`text-xs leading-snug ${done ? "text-dark-slate/30 line-through" : "text-dark-slate/80"}`}>
                {tChecklist(item.key)}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

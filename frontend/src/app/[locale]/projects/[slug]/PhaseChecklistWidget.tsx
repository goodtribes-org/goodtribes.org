"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toggleChecklistItem } from "./(workspace)/edit/actions";
import { getChecklistForPhase, type ProjectPhaseValue } from "@/lib/projectPhase";

interface Props {
  slug: string;
  phase: ProjectPhaseValue;
  completedKeys: string[];
  canEdit: boolean;
}

// Sidebar counterpart to PhaseMenuBar's popover checklist — same underlying
// InitiativeChecklistItem rows and toggleChecklistItem action, just always
// visible for the project's current phase instead of tucked behind a click.
export default function PhaseChecklistWidget({ slug, phase, completedKeys, canEdit }: Props) {
  const t = useTranslations("ProjectDetailPage");
  const tPhase = useTranslations("ProjectPhase");
  const tChecklist = useTranslations("ProjectPhaseChecklist");
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set(completedKeys));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDoneKeys(new Set(completedKeys));
  }, [completedKeys]);

  const checklist = getChecklistForPhase(phase);
  if (!checklist || checklist.length === 0) return null;

  const doneCount = checklist.filter((item) => doneKeys.has(item.key)).length;

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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-dark-slate">
          {t("checklistWidgetHeading", { phase: tPhase(phase) })}
        </h2>
        <span className="text-xs text-dark-slate/40 tabular-nums">
          {doneCount}/{checklist.length}
        </span>
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

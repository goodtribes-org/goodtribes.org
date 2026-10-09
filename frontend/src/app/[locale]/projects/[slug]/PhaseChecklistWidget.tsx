"use client";

import { useEffect, useMemo, useState, useTransition, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { toggleChecklistItem } from "./(workspace)/edit/actions";
import { getChecklistForPhase, PHASE_COLORS, type ProjectPhaseValue } from "@/lib/projectPhase";

interface Props {
  slug: string;
  phase: ProjectPhaseValue;
  completedKeys: string[];
  // Done because the project's data shows it (lib/projectSignals.ts) — same
  // as PhaseMenuBar, so the widget and the bars always agree.
  autoDoneKeys?: string[];
  canEdit: boolean;
  // The last phase-gate decision, already worded ("Gå vidare, 12 sep").
  lastDecision?: string | null;
}

// Sidebar counterpart to PhaseMenuBar's popover checklist — same underlying
// InitiativeChecklistItem rows and toggleChecklistItem action, just always
// visible for the project's current phase instead of tucked behind a click.
// Styled as "Din fasresa" so it visually pairs with the phase arrows above
// (same per-phase color from PHASE_COLORS), instead of a generic
// "Checklista: {phase}" label.
export default function PhaseChecklistWidget({ slug, phase, completedKeys, autoDoneKeys = [], canEdit, lastDecision }: Props) {
  const tPhase = useTranslations("ProjectPhase");
  const tWidget = useTranslations("PhaseChecklistWidget");
  const tChecklist = useTranslations("ProjectPhaseChecklist");
  const [ticked, setTicked] = useState<Set<string>>(new Set(completedKeys));
  const [isPending, startTransition] = useTransition();
  // What's going on now is the point; the full checklist is one click away.
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setTicked(new Set(completedKeys));
  }, [completedKeys]);
  const auto = useMemo(() => new Set(autoDoneKeys), [autoDoneKeys]);
  const doneKeys = useMemo(() => new Set([...ticked, ...auto]), [ticked, auto]);

  const checklist = getChecklistForPhase(phase);
  if (!checklist || checklist.length === 0) return null;

  const doneCount = checklist.filter((item) => doneKeys.has(item.key)).length;
  const current = checklist.find((item) => !doneKeys.has(item.key));
  const pct = Math.round((doneCount / checklist.length) * 100);
  const phaseColor = PHASE_COLORS[phase];
  const barStyle = { "--phase-color-full": phaseColor } as CSSProperties;

  function handleToggle(itemKey: string, done: boolean) {
    if (!canEdit || auto.has(itemKey)) return;
    setTicked((prev) => {
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
        {/* Dark text, not the phase color: the warm scale's yellow and
            orange are too light to read as text on white. */}
        <span className="text-xs font-medium text-dark-slate/70">
          {tWidget("phaseProgress", { phase: tPhase(phase), done: doneCount, total: checklist.length })}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted-teal/15 overflow-hidden mb-3" style={barStyle}>
        <div
          className="h-full rounded-full bg-[color:var(--phase-color-full)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-dark-slate">
        {current ? tWidget.rich("now", { step: tChecklist(current.key), b: (c) => <b>{c}</b> }) : tWidget("allDone")}
      </p>
      {lastDecision && <p className="mt-1 text-xs text-dark-slate">{tWidget.rich("lastDecision", { decision: lastDecision, b: (c) => <b>{c}</b> })}</p>}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mt-2 text-xs font-medium text-seagrass hover:underline"
      >
        {expanded ? tWidget("hideChecklist") : tWidget("showChecklist")}
      </button>
      {expanded && (
      <div className="mt-2 flex flex-col gap-2 max-h-72 overflow-y-auto">
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
                disabled={isPending || !canEdit || auto.has(item.key)}
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
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useDraggable } from "@dnd-kit/core";
import { toDate, COLUMN_COLORS, COLUMN_LABEL_KEYS, type GanttCard, type GanttTodo } from "./ganttShared";

// Extracted from GanttView.tsx: a fully self-contained collapsible section
// (owns its own open/closed state, "unscheduledOpen" was never read anywhere
// else in GanttView) listing cards/todos that have neither a start nor a due
// date — draggable back onto the schedule via UnscheduledCardRow.
//
// useDraggable must be called from a real component (one hook call per
// rendered instance), not inline inside a .map() callback — same constraint
// noted on ColumnDropZone, which is why UnscheduledCardRow stays a small
// component of its own rather than being inlined into the .map() below.
function UnscheduledCardRow({
  card,
  colorClass,
  columnLabel,
}: {
  card: { id: string; title: string };
  colorClass: string;
  columnLabel: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 px-3 py-2 rounded border border-muted-teal/20 bg-white cursor-grab active:cursor-grabbing touch-none ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${colorClass}`} />
      <span className="text-sm text-dark-slate">{card.title}</span>
      <span className="text-xs text-dark-slate/30 ml-auto">{columnLabel}</span>
    </div>
  );
}

export default function GanttUnscheduledSection({
  cards,
  todos,
}: {
  cards: GanttCard[];
  todos: GanttTodo[];
}) {
  const t = useTranslations("GanttView");
  const [unscheduledOpen, setUnscheduledOpen] = useState(false);

  const unscheduled = cards.filter((c) => !toDate(c.startDate) && !toDate(c.dueDate));
  const unscheduledTodos = todos.filter((td) => !toDate(td.dueDate));

  return (
    <div className="mt-4">
      {(unscheduled.length > 0 || unscheduledTodos.length > 0) && (
        <div>
          <button
            onClick={() => setUnscheduledOpen((o) => !o)}
            className="flex items-center gap-1.5 text-sm font-semibold text-dark-slate/50 hover:text-dark-slate transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${unscheduledOpen ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {t("unscheduledSectionToggle", { count: unscheduled.length + unscheduledTodos.length })}
          </button>
          {unscheduledOpen && unscheduled.length > 0 && (
            <p className="text-xs text-dark-slate/40 mt-1 mb-2">{t("unscheduledDragHint")}</p>
          )}
          {unscheduledOpen && (
            <div className="space-y-1 mt-2">
              {unscheduled.map((card) => (
                <UnscheduledCardRow
                  key={card.id}
                  card={card}
                  colorClass={COLUMN_COLORS[card.column]}
                  columnLabel={t(COLUMN_LABEL_KEYS[card.column])}
                />
              ))}
              {unscheduledTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-2 px-3 py-2 rounded border border-amber-100 bg-amber-50/40"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${todo.done ? "bg-green-400" : "bg-amber-400"}`} />
                  <span className={`text-sm ${todo.done ? "line-through text-dark-slate/40" : "text-dark-slate"}`}>{todo.title}</span>
                  <span className="text-xs text-amber-400/70 ml-auto">{t("unscheduledTodoBadge")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

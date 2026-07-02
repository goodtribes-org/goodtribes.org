"use client";

import { useState, useTransition } from "react";
import { updateCard } from "@/app/projects/[slug]/kanban/actions";
import Tooltip from "@/components/Tooltip";

type GanttCard = {
  id: string;
  title: string;
  column: string;
  priority: string;
  startDate: Date | string | null;
  dueDate: Date | string | null;
  description?: string | null;
  assignee?: { name: string | null } | null;
};

type GanttMilestone = {
  id: string;
  title: string;
  dueDate: Date | string | null;
  status: string;
};

type GanttTodo = {
  id: string;
  title: string;
  dueDate: Date | string | null;
  done: boolean;
};

interface GanttViewProps {
  cards: GanttCard[];
  todos?: GanttTodo[];
  milestones: GanttMilestone[];
  projectSlug: string;
  isOwnerOrAdmin: boolean;
}

const DAY_WIDTH = 24;
const LABEL_WIDTH = 220;
const ROW_H = 36;

const COLUMN_ORDER = ["BACKLOG", "TODO", "DOING", "REVIEW", "DONE"];
const COLUMN_LABELS: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "Att göra",
  DOING: "Pågående",
  REVIEW: "Granskning",
  DONE: "Klart",
};
const COLUMN_COLORS: Record<string, string> = {
  BACKLOG: "bg-gray-400",
  TODO: "bg-sky-500",
  DOING: "bg-amber-500",
  REVIEW: "bg-purple-500",
  DONE: "bg-green-500",
};

const MONTH_NAMES_SV = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

function toDate(d: Date | string | null): Date | null {
  if (!d) return null;
  return d instanceof Date ? d : new Date(d);
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function fmtDate(d: Date | string | null): string | null {
  const date = toDate(d);
  if (!date) return null;
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

export default function GanttView({ cards, todos = [], milestones, isOwnerOrAdmin }: GanttViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [unscheduledOpen, setUnscheduledOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [, startTransition] = useTransition();

  const now = new Date();

  // Calculate date range from all dates
  const allDates: Date[] = [];
  for (const c of cards) {
    const s = toDate(c.startDate);
    const e = toDate(c.dueDate);
    if (s) allDates.push(s);
    if (e) allDates.push(e);
  }
  for (const m of milestones) {
    const d = toDate(m.dueDate);
    if (d) allDates.push(d);
  }
  for (const t of todos) {
    const d = toDate(t.dueDate);
    if (d) allDates.push(d);
  }
  allDates.push(now);

  const scheduledTodos = todos.filter((t) => toDate(t.dueDate));
  const unscheduledTodos = todos.filter((t) => !toDate(t.dueDate));

  let rangeStart = addDays(new Date(Math.min(...allDates.map((d) => d.getTime()))), -7);
  let rangeEnd = addDays(new Date(Math.max(...allDates.map((d) => d.getTime()))), 14);

  // Ensure minimum 60-day range
  if (diffDays(rangeStart, rangeEnd) < 60) {
    rangeEnd = addDays(rangeStart, 60);
  }

  // Snap rangeStart to Monday
  const dow = rangeStart.getDay();
  const daysToMon = (dow + 6) % 7;
  rangeStart = addDays(rangeStart, -daysToMon);

  const totalDays = diffDays(rangeStart, rangeEnd) + 1;

  // Separate scheduled vs unscheduled
  const scheduled = cards.filter((c) => toDate(c.startDate) || toDate(c.dueDate));
  const unscheduled = cards.filter((c) => !toDate(c.startDate) && !toDate(c.dueDate));

  // Group scheduled by column
  const byColumn: Record<string, GanttCard[]> = {};
  for (const c of scheduled) {
    if (!byColumn[c.column]) byColumn[c.column] = [];
    byColumn[c.column].push(c);
  }

  // Build month header spans
  const monthSpans: { label: string; days: number }[] = [];
  let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (cursor <= rangeEnd) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const spanStart = cursor < rangeStart ? rangeStart : cursor;
    const spanEnd = monthEnd > rangeEnd ? rangeEnd : monthEnd;
    const days = diffDays(spanStart, spanEnd) + 1;
    monthSpans.push({ label: `${MONTH_NAMES_SV[cursor.getMonth()]} ${cursor.getFullYear()}`, days });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  const todayOffset = diffDays(rangeStart, now) * DAY_WIDTH;

  function toggleCollapse(col: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  }

  function openEdit(card: GanttCard) {
    const s = toDate(card.startDate);
    const e = toDate(card.dueDate);
    setEditingCard(card.id);
    setEditStart(s ? toISODate(s) : "");
    setEditEnd(e ? toISODate(e) : "");
  }

  function saveEdit(cardId: string) {
    startTransition(async () => {
      await updateCard(cardId, {
        startDate: editStart || null,
        dueDate: editEnd || null,
      });
    });
    setEditingCard(null);
  }

  function barLeft(card: GanttCard): number | null {
    const s = toDate(card.startDate);
    const e = toDate(card.dueDate);
    if (s) return diffDays(rangeStart, s) * DAY_WIDTH;
    if (e) return diffDays(rangeStart, e) * DAY_WIDTH;
    return null;
  }

  function barWidth(card: GanttCard): number {
    const s = toDate(card.startDate);
    const e = toDate(card.dueDate);
    if (s && e) return Math.max(diffDays(s, e) + 1, 1) * DAY_WIDTH;
    return DAY_WIDTH;
  }

  const hasMilestoneRow = milestones.some((m) => toDate(m.dueDate));

  return (
    <div>
      <div className="rounded-lg border border-muted-teal/20 overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: LABEL_WIDTH + totalDays * DAY_WIDTH }}>

            {/* Month header */}
            <div className="flex border-b border-muted-teal/20 bg-gray-50 h-8">
              <div style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }} className="shrink-0 sticky left-0 bg-gray-50 z-10 border-r border-muted-teal/20" />
              {monthSpans.map((m, i) => (
                <div
                  key={i}
                  style={{ width: m.days * DAY_WIDTH, minWidth: m.days * DAY_WIDTH }}
                  className="shrink-0 flex items-center px-2 border-r border-muted-teal/20 text-xs font-medium text-dark-slate/60 overflow-hidden"
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* Milestones row */}
            {hasMilestoneRow && (
              <div className="flex border-b border-muted-teal/10 bg-purple-50/30" style={{ height: ROW_H }}>
                <div
                  style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
                  className="shrink-0 sticky left-0 bg-purple-50/60 z-10 border-r border-muted-teal/20 flex items-center px-3"
                >
                  <span className="text-xs font-semibold text-purple-700">Milstolpar</span>
                </div>
                <div className="relative flex-1">
                  {/* Today line */}
                  {todayOffset >= 0 && (
                    <div className="absolute top-0 bottom-0 w-px bg-coral/50 z-10 pointer-events-none" style={{ left: todayOffset }} />
                  )}
                  {milestones.map((m) => {
                    const d = toDate(m.dueDate);
                    if (!d) return null;
                    const left = diffDays(rangeStart, d) * DAY_WIDTH;
                    const tooltipLines = [m.title].filter(Boolean);
                    return (
                      <Tooltip key={m.id} lines={tooltipLines} className="absolute flex items-center justify-center" style={{ left: left - 7, top: "50%", transform: "translateY(-50%)", width: 14 } as React.CSSProperties}>
                        <span className={`text-base leading-none select-none ${m.status === "done" ? "text-seagrass" : "text-purple-600"}`}>◆</span>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Todo group */}
            {scheduledTodos.length > 0 && (
              <div>
                <div className="flex border-b border-muted-teal/20 bg-amber-50/40 h-8">
                  <div
                    style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
                    className="shrink-0 sticky left-0 bg-amber-50/60 z-10 border-r border-muted-teal/20 flex items-center px-3"
                  >
                    <span className="text-xs font-semibold text-amber-700">Todos</span>
                    <span className="text-xs text-amber-500/60 ml-auto">{scheduledTodos.length}</span>
                  </div>
                  <div className="relative flex-1 bg-amber-50/30">
                    {todayOffset >= 0 && (
                      <div className="absolute top-0 bottom-0 w-px bg-coral/50 z-10 pointer-events-none" style={{ left: todayOffset }} />
                    )}
                  </div>
                </div>
                {scheduledTodos.map((todo) => {
                  const d = toDate(todo.dueDate)!;
                  const left = diffDays(rangeStart, d) * DAY_WIDTH;
                  return (
                    <div key={todo.id} className="flex border-b border-muted-teal/10" style={{ minHeight: ROW_H }}>
                      <div
                        style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
                        className="shrink-0 sticky left-0 bg-white z-10 border-r border-muted-teal/20 flex items-center px-3 gap-2"
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${todo.done ? "bg-green-400" : "bg-amber-400"}`} />
                        <span className={`text-xs truncate ${todo.done ? "line-through text-dark-slate/40" : "text-dark-slate"}`} title={todo.title}>
                          {todo.title}
                        </span>
                      </div>
                      <div className="relative flex-1" style={{ minHeight: ROW_H }}>
                        {todayOffset >= 0 && (
                          <div className="absolute top-0 bottom-0 w-px bg-coral/50 z-10 pointer-events-none" style={{ left: todayOffset }} />
                        )}
                        <Tooltip
                          lines={[todo.title]}
                          className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center ${todo.done ? "text-green-500" : "text-amber-500"}`}
                          style={{ left: left - 7 }}
                        >
                          <span className="text-base leading-none select-none">◆</span>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Column groups */}
            {COLUMN_ORDER.map((col) => {
              const colCards = byColumn[col] ?? [];
              if (!colCards.length) return null;
              const isCollapsed = collapsed.has(col);

              return (
                <div key={col}>
                  {/* Column header row */}
                  <div className="flex border-b border-muted-teal/10 bg-gray-50/80 h-8">
                    <div
                      style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
                      className="shrink-0 sticky left-0 bg-gray-50/90 z-10 border-r border-muted-teal/20 flex items-center"
                    >
                      <button
                        onClick={() => toggleCollapse(col)}
                        className="flex items-center gap-1.5 px-3 w-full h-full hover:bg-gray-100/80 transition-colors"
                      >
                        <span className="text-[10px] text-dark-slate/50">{isCollapsed ? "▶" : "▼"}</span>
                        <span className="text-xs font-semibold text-dark-slate/60">{COLUMN_LABELS[col]}</span>
                        <span className="text-xs text-dark-slate/30 ml-auto">{colCards.length}</span>
                      </button>
                    </div>
                    <div className="relative flex-1 bg-gray-50/60">
                      {/* Today line */}
                      {todayOffset >= 0 && (
                        <div className="absolute top-0 bottom-0 w-px bg-coral/50 z-10 pointer-events-none" style={{ left: todayOffset }} />
                      )}
                    </div>
                  </div>

                  {/* Card rows */}
                  {!isCollapsed &&
                    colCards.map((card) => {
                      const left = barLeft(card);
                      const width = barWidth(card);
                      const isEditing = editingCard === card.id;

                      return (
                        <div key={card.id} className="flex border-b border-muted-teal/10" style={{ minHeight: ROW_H }}>
                          {/* Label cell */}
                          <div
                            style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
                            className="shrink-0 sticky left-0 bg-white z-10 border-r border-muted-teal/20 flex flex-col justify-center px-3 py-1"
                          >
                            <span className="text-xs text-dark-slate truncate" title={card.title}>
                              {card.title}
                            </span>
                            {isEditing && isOwnerOrAdmin && (
                              <div className="mt-1.5 space-y-1.5">
                                <div>
                                  <label className="text-[10px] text-dark-slate/50 block mb-0.5">Startdatum</label>
                                  <input
                                    type="date"
                                    value={editStart}
                                    onChange={(e) => setEditStart(e.target.value)}
                                    className="w-full border border-muted-teal/40 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-coral"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-dark-slate/50 block mb-0.5">Slutdatum</label>
                                  <input
                                    type="date"
                                    value={editEnd}
                                    onChange={(e) => setEditEnd(e.target.value)}
                                    className="w-full border border-muted-teal/40 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-coral"
                                  />
                                </div>
                                <div className="flex gap-1.5 pb-1">
                                  <button
                                    onClick={() => saveEdit(card.id)}
                                    className="flex-1 bg-coral text-white text-[10px] font-medium py-0.5 rounded hover:bg-watermelon transition-colors"
                                  >
                                    Spara
                                  </button>
                                  <button
                                    onClick={() => setEditingCard(null)}
                                    className="text-[10px] text-dark-slate/40 hover:text-dark-slate px-1.5"
                                  >
                                    Avbryt
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Bar cell */}
                          <div className="relative flex-1" style={{ minHeight: ROW_H }}>
                            {/* Today line */}
                            {todayOffset >= 0 && (
                              <div className="absolute top-0 bottom-0 w-px bg-coral/50 z-10 pointer-events-none" style={{ left: todayOffset }} />
                            )}
                            {left !== null && (() => {
                              const tooltipLines = [
                                card.title,
                                card.assignee?.name ? `Ansvarig: ${card.assignee.name}` : null,
                                card.description ?? null,
                              ].filter((s): s is string => Boolean(s));
                              return (
                                <Tooltip
                                  lines={tooltipLines}
                                  className="absolute top-1/2 -translate-y-1/2"
                                  style={{ left, width }}
                                >
                                  <button
                                    onClick={() => isOwnerOrAdmin ? (isEditing ? setEditingCard(null) : openEdit(card)) : undefined}
                                    className={`w-full h-5 rounded transition-opacity ${
                                      COLUMN_COLORS[card.column]
                                    } ${isOwnerOrAdmin ? "cursor-pointer opacity-80 hover:opacity-100" : "cursor-default opacity-80"} ${
                                      isEditing ? "ring-2 ring-offset-1 ring-coral" : ""
                                    }`}
                                  />
                                </Tooltip>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend — under Gantt-schemat */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-dark-slate/70">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Milstolpe
        </span>
        {COLUMN_ORDER.map((col) => (
          <span key={col} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${COLUMN_COLORS[col]}`} /> {COLUMN_LABELS[col]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Todo
        </span>
      </div>

      {/* Ej schemalagda — collapsible, collapsed by default */}
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
              Ej schemalagda ({unscheduled.length + unscheduledTodos.length})
            </button>
            {unscheduledOpen && (
              <div className="space-y-1 mt-2">
                {unscheduled.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center gap-2 px-3 py-2 rounded border border-muted-teal/20 bg-white"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${COLUMN_COLORS[card.column]}`} />
                    <span className="text-sm text-dark-slate">{card.title}</span>
                    <span className="text-xs text-dark-slate/30 ml-auto">{COLUMN_LABELS[card.column]}</span>
                  </div>
                ))}
                {unscheduledTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-2 px-3 py-2 rounded border border-amber-100 bg-amber-50/40"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${todo.done ? "bg-green-400" : "bg-amber-400"}`} />
                    <span className={`text-sm ${todo.done ? "line-through text-dark-slate/40" : "text-dark-slate"}`}>{todo.title}</span>
                    <span className="text-xs text-amber-400/70 ml-auto">Todo</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

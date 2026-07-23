"use client";

import { useState, useTransition, useRef } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
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
  dependsOnIds?: string[];
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
  onUpdateCard: (cardId: string, updates: { startDate: string | null; dueDate: string | null }) => unknown;
  onMoveCard?: (cardId: string, newColumn: string) => unknown;
  onAddDependency?: (cardId: string, dependsOnId: string) => unknown;
  onRemoveDependency?: (cardId: string, dependsOnId: string) => unknown;
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

// useDroppable/useDraggable must be called from a real component (one hook
// call per rendered instance), not inline inside a .map() callback — these
// stay in this file since they're only ever used here, not shared elsewhere.
function ColumnDropZone({ col }: { col: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${col}` });
  return (
    <div
      ref={setNodeRef}
      data-testid={`gantt-drop-${col}`}
      className="absolute inset-0 rounded transition-colors pointer-events-none"
      style={{ backgroundColor: isOver ? "rgba(45,122,110,0.10)" : "transparent" }}
    />
  );
}

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

export default function GanttView({
  cards,
  todos = [],
  milestones,
  isOwnerOrAdmin,
  onUpdateCard,
  onMoveCard,
  onAddDependency,
  onRemoveDependency,
}: GanttViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [unscheduledOpen, setUnscheduledOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStartClientX = useRef(0);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

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
      await onUpdateCard(cardId, {
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

  const cardById = new Map(cards.map((c) => [c.id, c]));
  const dependencyEdges: { from: string; to: string }[] = [];
  for (const card of cards) {
    for (const depId of card.dependsOnIds ?? []) {
      dependencyEdges.push({ from: depId, to: card.id });
    }
  }

  // Row Y-centers for every currently-rendered scheduled card, computed by
  // walking the exact same stacking order as the JSX below (every row/header
  // height is a fixed constant — h-8/32px headers, ROW_H rows, no wrapping
  // text — so this stays pixel-accurate without measuring the real DOM).
  // Cards in a collapsed column, or unscheduled, are absent from the map —
  // dependency lines to/from them are simply not drawn (see rendering below).
  const rowTops = new Map<string, number>();
  let gridHeight = 32; // month header
  if (hasMilestoneRow) gridHeight += ROW_H;
  if (scheduledTodos.length > 0) gridHeight += 32 + scheduledTodos.length * ROW_H;
  for (const col of COLUMN_ORDER) {
    gridHeight += 32; // column header
    if (!collapsed.has(col)) {
      const colCards = byColumn[col] ?? [];
      if (colCards.length === 0) {
        gridHeight += ROW_H;
      } else {
        for (const card of colCards) {
          rowTops.set(card.id, gridHeight + ROW_H / 2);
          gridHeight += ROW_H;
        }
      }
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const activator = event.activatorEvent as PointerEvent | MouseEvent | undefined;
    dragStartClientX.current = activator?.clientX ?? 0;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const overId = over.id as string;
    if (!overId.startsWith("col-")) return;
    const targetColumn = overId.slice("col-".length);
    const cardId = active.id as string;

    const container = scrollRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const finalClientX = dragStartClientX.current + event.delta.x;
    const dayIndex = Math.round(
      (finalClientX - containerRect.left + container.scrollLeft - LABEL_WIDTH) / DAY_WIDTH
    );
    const date = toISODate(addDays(rangeStart, dayIndex));

    startTransition(async () => {
      const moveResult = await onMoveCard?.(cardId, targetColumn);
      if (moveResult && typeof moveResult === "object" && "error" in moveResult) {
        alert((moveResult as { error: string }).error);
        return;
      }
      await onUpdateCard(cardId, { startDate: date, dueDate: date });
    });
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <div>
      <div className="rounded-lg border border-muted-teal/20 overflow-hidden">
        <div className="overflow-x-auto" ref={scrollRef}>
          <div className="relative" style={{ minWidth: LABEL_WIDTH + totalDays * DAY_WIDTH }}>

            {/* Dependency connector lines */}
            {dependencyEdges.length > 0 && (
              <svg
                className="absolute top-0 left-0 pointer-events-none"
                width={LABEL_WIDTH + totalDays * DAY_WIDTH}
                height={gridHeight}
                style={{ zIndex: 5 }}
              >
                <defs>
                  <marker id="gantt-dep-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
                  </marker>
                </defs>
                {dependencyEdges.map((edge, i) => {
                  const fromTop = rowTops.get(edge.from);
                  const toTop = rowTops.get(edge.to);
                  const fromCard = cardById.get(edge.from);
                  const toCard = cardById.get(edge.to);
                  if (fromTop === undefined || toTop === undefined || !fromCard || !toCard) return null;
                  const fromLeft = barLeft(fromCard);
                  const toLeft = barLeft(toCard);
                  if (fromLeft === null || toLeft === null) return null;
                  const x1 = LABEL_WIDTH + fromLeft + barWidth(fromCard);
                  const x2 = LABEL_WIDTH + toLeft;
                  return (
                    <path
                      key={i}
                      d={`M${x1},${fromTop} L${x2},${toTop}`}
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      fill="none"
                      markerEnd="url(#gantt-dep-arrow)"
                    />
                  );
                })}
              </svg>
            )}

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

            {/* Column groups — always rendered (even with 0 scheduled cards)
                so there's always a drop target to schedule the first task
                from the unscheduled list into that column, see ColumnDropZone. */}
            {COLUMN_ORDER.map((col) => {
              const colCards = byColumn[col] ?? [];
              const isCollapsed = collapsed.has(col);

              return (
                <div key={col} className="relative">
                  <ColumnDropZone col={col} />
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

                  {/* Empty state — still a drop target via ColumnDropZone above */}
                  {!isCollapsed && colCards.length === 0 && (
                    <div className="flex border-b border-muted-teal/10" style={{ minHeight: ROW_H }}>
                      <div
                        style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
                        className="shrink-0 sticky left-0 bg-white z-10 border-r border-muted-teal/20 flex items-center px-3"
                      >
                        <span className="text-xs text-dark-slate/30">Släpp en uppgift här</span>
                      </div>
                      <div className="flex-1" style={{ minHeight: ROW_H }} />
                    </div>
                  )}

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
                                {(onAddDependency || onRemoveDependency) && (
                                  <div className="pt-1 border-t border-muted-teal/20">
                                    <label className="text-[10px] text-dark-slate/50 block mb-0.5">Beror på</label>
                                    {(card.dependsOnIds ?? []).map((depId) => (
                                      <div key={depId} className="flex items-center gap-1 mb-0.5">
                                        <span className="text-[10px] text-dark-slate truncate flex-1" title={cardById.get(depId)?.title}>
                                          {cardById.get(depId)?.title ?? depId}
                                        </span>
                                        <button
                                          onClick={() => onRemoveDependency?.(card.id, depId)}
                                          aria-label="Ta bort beroende"
                                          className="text-[10px] text-dark-slate/30 hover:text-watermelon px-1"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                    <select
                                      value=""
                                      onChange={(e) => {
                                        const depId = e.target.value;
                                        if (!depId) return;
                                        e.target.value = "";
                                        startTransition(async () => {
                                          const result = await onAddDependency?.(card.id, depId);
                                          if (result && typeof result === "object" && "error" in result) {
                                            alert((result as { error: string }).error);
                                          }
                                        });
                                      }}
                                      className="w-full border border-muted-teal/40 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-coral"
                                    >
                                      <option value="">+ Lägg till...</option>
                                      {cards
                                        .filter((c) => c.id !== card.id && !(card.dependsOnIds ?? []).includes(c.id))
                                        .map((c) => (
                                          <option key={c.id} value={c.id}>{c.title}</option>
                                        ))}
                                    </select>
                                  </div>
                                )}
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
                                    data-testid={`gantt-bar-${card.id}`}
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
            {unscheduledOpen && unscheduled.length > 0 && (
              <p className="text-xs text-dark-slate/40 mt-1 mb-2">Dra en uppgift upp i schemat för att schemalägga den.</p>
            )}
            {unscheduledOpen && (
              <div className="space-y-1 mt-2">
                {unscheduled.map((card) => (
                  <UnscheduledCardRow
                    key={card.id}
                    card={card}
                    colorClass={COLUMN_COLORS[card.column]}
                    columnLabel={COLUMN_LABELS[card.column]}
                  />
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
    </DndContext>
  );
}

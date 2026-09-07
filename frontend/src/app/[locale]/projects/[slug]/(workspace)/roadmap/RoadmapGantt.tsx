"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Tooltip from "@/components/Tooltip";
import { getChecklistForPhase, numberChecklist, type ProjectPhaseValue } from "@/lib/projectPhase";
import type { PhaseTimelineStatus } from "@/lib/roadmap";
import { upsertPhaseTarget } from "./actions";
import { upsertChecklistItemDates } from "../edit/actions";

export type GanttPhaseRow = {
  value: ProjectPhaseValue;
  label: string;
  status: PhaseTimelineStatus;
  startDate: Date | null;
  targetDate: Date | null;
};

export type GanttMilestoneRow = {
  id: string;
  title: string;
  dueDate: Date | null;
  timelineStatus: "done" | "overdue" | "upcoming";
};

export type GanttChecklistItemRow = {
  itemKey: string;
  done: boolean;
  startDate: Date | null;
  dueDate: Date | null;
};

interface RoadmapGanttProps {
  phases: GanttPhaseRow[];
  milestones: GanttMilestoneRow[];
  checklistItems: GanttChecklistItemRow[];
  isOwnerOrAdmin: boolean;
  projectId: string;
  slug: string;
}

// Same visual language/constants as GanttView.tsx (the "Att göra" Gantt) —
// deliberately matched so this reads as the same design, not a lookalike.
const DAY_WIDTH = 24;
const LABEL_WIDTH = 220;
const ROW_H = 36;
const PHASE_ROW_H = 48;

const MONTH_KEYS = [
  "monthJan", "monthFeb", "monthMar", "monthApr", "monthMay", "monthJun",
  "monthJul", "monthAug", "monthSep", "monthOct", "monthNov", "monthDec",
] as const;

const STATUS_BAR_COLOR: Record<PhaseTimelineStatus, string> = {
  completed: "bg-seagrass",
  in_progress: "bg-blue-500",
  at_risk: "bg-watermelon",
  upcoming: "bg-gray-300",
};

const STATUS_LABEL_KEYS: Record<PhaseTimelineStatus, string> = {
  completed: "statusCompleted",
  in_progress: "statusInProgress",
  at_risk: "statusAtRisk",
  upcoming: "statusUpcoming",
};

const MILESTONE_MARKER_COLOR: Record<GanttMilestoneRow["timelineStatus"], string> = {
  done: "text-seagrass",
  overdue: "text-watermelon",
  upcoming: "text-purple-600",
};

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function toISODate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

function formatDateSv(date: Date | null) {
  if (!date) return null;
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

export default function RoadmapGantt({ phases, milestones, checklistItems, isOwnerOrAdmin, projectId, slug }: RoadmapGanttProps) {
  const t = useTranslations("RoadmapPage");
  const tGantt = useTranslations("GanttView");
  const tChecklist = useTranslations("ProjectPhaseChecklist");
  const checklistByKey = new Map(checklistItems.map((c) => [c.itemKey, c]));
  const [expanded, setExpanded] = useState<Set<ProjectPhaseValue>>(new Set());
  const [editingPhase, setEditingPhase] = useState<ProjectPhaseValue | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editItemStart, setEditItemStart] = useState("");
  const [editItemEnd, setEditItemEnd] = useState("");
  const [, startTransition] = useTransition();

  const now = new Date();

  const allDates: Date[] = [now];
  for (const p of phases) {
    if (p.startDate) allDates.push(p.startDate);
    if (p.targetDate) allDates.push(p.targetDate);
  }
  for (const m of milestones) {
    if (m.dueDate) allDates.push(m.dueDate);
  }
  for (const c of checklistItems) {
    if (c.startDate) allDates.push(c.startDate);
    if (c.dueDate) allDates.push(c.dueDate);
  }

  let rangeStart = addDays(new Date(Math.min(...allDates.map((d) => d.getTime()))), -7);
  let rangeEnd = addDays(new Date(Math.max(...allDates.map((d) => d.getTime()))), 14);
  if (diffDays(rangeStart, rangeEnd) < 60) rangeEnd = addDays(rangeStart, 60);
  rangeStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);

  const totalDays = diffDays(rangeStart, rangeEnd) + 1;

  function dayOffset(d: Date): number {
    return diffDays(rangeStart, d) * DAY_WIDTH;
  }

  const monthSpans: { label: string; days: number }[] = [];
  let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (cursor <= rangeEnd) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const spanStart = cursor < rangeStart ? rangeStart : cursor;
    const spanEnd = monthEnd > rangeEnd ? rangeEnd : monthEnd;
    const days = diffDays(spanStart, spanEnd) + 1;
    monthSpans.push({ label: `${tGantt(MONTH_KEYS[cursor.getMonth()])} ${cursor.getFullYear()}`, days });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  const todayOffset = dayOffset(now);

  type Bar = { kind: "bar"; left: number; width: number } | { kind: "marker"; left: number } | null;

  // Shared by phase rows (start/targetDate) and checklist-item rows
  // (start/dueDate) — a range with only one end sees an open-ended bar
  // drawn out to "today" (still ongoing) unless it's already done, in which
  // case it gets a short fixed-length bar instead of stretching indefinitely.
  function computeBar(start: Date | null, end: Date | null, isDone: boolean): Bar {
    if (start && end) {
      return { kind: "bar", left: dayOffset(start), width: Math.max(diffDays(start, end) + 1, 1) * DAY_WIDTH };
    }
    if (end) {
      return { kind: "marker", left: dayOffset(end) };
    }
    if (start) {
      const closeEnd = isDone ? addDays(start, 14) : now > start ? now : addDays(start, 1);
      return { kind: "bar", left: dayOffset(start), width: Math.max(diffDays(start, closeEnd) + 1, 1) * DAY_WIDTH };
    }
    return null;
  }

  function toggleExpand(phase: ProjectPhaseValue) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  }

  function openEdit(p: GanttPhaseRow) {
    setEditingPhase(p.value);
    setEditStart(toISODate(p.startDate));
    setEditEnd(toISODate(p.targetDate));
  }

  function saveEdit(phase: ProjectPhaseValue) {
    startTransition(async () => {
      await upsertPhaseTarget(projectId, slug, phase, editStart || null, editEnd || null);
    });
    setEditingPhase(null);
  }

  function openEditItem(itemKey: string, start: Date | null, end: Date | null) {
    setEditingItem(itemKey);
    setEditItemStart(toISODate(start));
    setEditItemEnd(toISODate(end));
  }

  function saveEditItem(phase: ProjectPhaseValue, itemKey: string) {
    startTransition(async () => {
      await upsertChecklistItemDates(projectId, slug, phase, itemKey, editItemStart || null, editItemEnd || null);
    });
    setEditingItem(null);
  }

  return (
    <div>
      <div className="rounded-lg border border-muted-teal/20 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="relative" style={{ minWidth: LABEL_WIDTH + totalDays * DAY_WIDTH }}>
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

            {/* Phase rows (+ expanded task rows) */}
            {phases.map((p, phaseIndex) => {
              const bar = computeBar(p.startDate, p.targetDate, p.status === "completed");
              const isEditing = editingPhase === p.value;
              const checklist = getChecklistForPhase(p.value);
              const itemNumbers = numberChecklist(checklist, phaseIndex + 1);
              const canExpand = checklist.length > 0;
              const isExpanded = expanded.has(p.value);
              const dateRangeText =
                p.startDate && p.targetDate
                  ? `${formatDateSv(p.startDate)} – ${formatDateSv(p.targetDate)}`
                  : p.targetDate
                  ? `${t("targetDateLabel")}: ${formatDateSv(p.targetDate)}`
                  : p.startDate
                  ? `${t("startDateLabel")}: ${formatDateSv(p.startDate)}`
                  : t("noTargetDateSet");

              return (
                <div key={p.value}>
                  <div className="flex border-b border-muted-teal/10" style={{ minHeight: PHASE_ROW_H }}>
                    <div
                      style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
                      className="shrink-0 sticky left-0 bg-white z-10 border-r border-muted-teal/20 flex flex-col justify-center px-2 py-1"
                    >
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => canExpand && toggleExpand(p.value)}
                          disabled={!canExpand}
                          aria-label={isExpanded ? t("collapsePhaseAriaLabel") : t("expandPhaseAriaLabel")}
                          className={`text-[10px] w-3 shrink-0 ${canExpand ? "text-dark-slate/50 hover:text-dark-slate" : "text-transparent"}`}
                        >
                          {isExpanded ? "▼" : "▶"}
                        </button>
                        <span className="text-xs font-medium text-dark-slate truncate flex-1">{p.label}</span>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wide shrink-0 ${
                            p.status === "at_risk" ? "text-watermelon" : p.status === "completed" ? "text-seagrass" : "text-dark-slate/40"
                          }`}
                        >
                          {t(STATUS_LABEL_KEYS[p.status])}
                        </span>
                      </div>

                      {isEditing ? (
                        <div className="mt-1 pl-[18px] space-y-1">
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={editStart}
                              onChange={(e) => setEditStart(e.target.value)}
                              title={t("startDateLabel")}
                              className="w-[92px] border border-muted-teal/40 rounded px-1 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-coral"
                            />
                            <input
                              type="date"
                              value={editEnd}
                              onChange={(e) => setEditEnd(e.target.value)}
                              title={t("targetDateLabel")}
                              className="w-[92px] border border-muted-teal/40 rounded px-1 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-coral"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => saveEdit(p.value)}
                              className="text-[10px] bg-coral text-white font-medium px-1.5 py-0.5 rounded hover:bg-watermelon transition-colors"
                            >
                              {t("saveDatesButton")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPhase(null)}
                              className="text-[10px] text-dark-slate/40 hover:text-dark-slate"
                            >
                              {t("cancelButton")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => isOwnerOrAdmin && openEdit(p)}
                          disabled={!isOwnerOrAdmin}
                          className={`text-[11px] text-dark-slate/50 mt-0.5 truncate text-left pl-[18px] ${
                            isOwnerOrAdmin ? "hover:text-dark-slate hover:underline cursor-pointer" : "cursor-default"
                          }`}
                        >
                          {dateRangeText}
                        </button>
                      )}
                    </div>

                    <div className="relative flex-1">
                      {todayOffset >= 0 && (
                        <div className="absolute top-0 bottom-0 w-px bg-coral/50 z-10 pointer-events-none" style={{ left: todayOffset }} />
                      )}
                      {bar?.kind === "bar" && (
                        <Tooltip
                          lines={[p.label, dateRangeText]}
                          className="absolute top-1/2 -translate-y-1/2"
                          style={{ left: bar.left, width: bar.width }}
                        >
                          <div className={`w-full h-5 rounded ${STATUS_BAR_COLOR[p.status]} opacity-80`} />
                        </Tooltip>
                      )}
                      {bar?.kind === "marker" && (
                        <Tooltip
                          lines={[p.label, dateRangeText]}
                          className="absolute flex items-center justify-center"
                          style={{ left: bar.left - 7, top: "50%", transform: "translateY(-50%)", width: 14 }}
                        >
                          <span className={`text-base leading-none select-none ${p.status === "at_risk" ? "text-watermelon" : "text-blue-600"}`}>◆</span>
                        </Tooltip>
                      )}
                    </div>
                  </div>

                  {isExpanded &&
                    checklist.map((item, itemIndex) => {
                      const itemData = checklistByKey.get(item.key);
                      const done = itemData?.done ?? false;
                      // An item with no date of its own follows the phase's date —
                      // "inherited" rather than stored — so it keeps tracking the
                      // phase until the user schedules this specific item, at which
                      // point its own saved date takes over.
                      const effectiveStart = itemData?.startDate ?? p.startDate;
                      const effectiveEnd = itemData?.dueDate ?? p.targetDate;
                      const itemBar = computeBar(effectiveStart, effectiveEnd, done);
                      const isEditingItem = editingItem === item.key;
                      const itemDateText =
                        effectiveStart && effectiveEnd
                          ? `${formatDateSv(effectiveStart)} – ${formatDateSv(effectiveEnd)}`
                          : effectiveEnd
                          ? `${t("targetDateLabel")}: ${formatDateSv(effectiveEnd)}`
                          : effectiveStart
                          ? `${t("startDateLabel")}: ${formatDateSv(effectiveStart)}`
                          : t("noTargetDateSet");
                      // Same fallback PhaseMenuBar's own checklist popover uses: an item
                      // with no dedicated tool page still links somewhere, to that phase's
                      // guide anchored at this step, instead of being unclickable.
                      const href = item.href
                        ? `/projects/${slug}/${item.href}`
                        : p.value === "IDEA"
                        ? `/projects/${slug}/guide?step=${item.key}`
                        : `/projects/${slug}/guide/${p.value.toLowerCase()}?step=${item.key}`;
                      return (
                        <div key={item.key} className="flex border-b border-muted-teal/10 bg-gray-50/40" style={{ minHeight: ROW_H }}>
                          <div
                            style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
                            className={`shrink-0 sticky left-0 bg-gray-50/60 z-10 border-r border-muted-teal/20 flex flex-col justify-center gap-0.5 pr-3 py-1 ${
                              item.parentKey ? "pl-10" : "pl-7"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-xs shrink-0 ${done ? "text-seagrass" : "text-dark-slate/20"}`}>{done ? "✓" : "○"}</span>
                              <a
                                href={href}
                                className={`text-xs truncate hover:underline ${done ? "text-dark-slate/40 line-through" : "text-dark-slate/80"}`}
                                title={tChecklist(item.key)}
                              >
                                <span className={done ? "text-dark-slate/30" : "text-dark-slate/40"}>{itemNumbers[itemIndex]}</span>{" "}
                                {tChecklist(item.key)}
                              </a>
                            </div>
                            {isEditingItem ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="date"
                                    value={editItemStart}
                                    onChange={(e) => setEditItemStart(e.target.value)}
                                    title={t("startDateLabel")}
                                    className="w-[92px] border border-muted-teal/40 rounded px-1 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-coral"
                                  />
                                  <input
                                    type="date"
                                    value={editItemEnd}
                                    onChange={(e) => setEditItemEnd(e.target.value)}
                                    title={t("targetDateLabel")}
                                    className="w-[92px] border border-muted-teal/40 rounded px-1 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-coral"
                                  />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => saveEditItem(p.value, item.key)}
                                    className="text-[10px] bg-coral text-white font-medium px-1.5 py-0.5 rounded hover:bg-watermelon transition-colors"
                                  >
                                    {t("saveDatesButton")}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingItem(null)}
                                    className="text-[10px] text-dark-slate/40 hover:text-dark-slate"
                                  >
                                    {t("cancelButton")}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-dark-slate/40 truncate">{itemDateText}</span>
                            )}
                          </div>
                          <div
                            className={`relative flex-1 ${isOwnerOrAdmin ? "cursor-pointer" : ""}`}
                            style={{ minHeight: ROW_H }}
                            onClick={() => isOwnerOrAdmin && openEditItem(item.key, effectiveStart, effectiveEnd)}
                          >
                            {todayOffset >= 0 && (
                              <div className="absolute top-0 bottom-0 w-px bg-coral/50 z-10 pointer-events-none" style={{ left: todayOffset }} />
                            )}
                            {itemBar?.kind === "bar" && (
                              <Tooltip
                                lines={[tChecklist(item.key), itemDateText]}
                                className="absolute top-1/2 -translate-y-1/2"
                                style={{ left: itemBar.left, width: itemBar.width }}
                              >
                                <div className={`w-full h-5 rounded ${done ? "bg-seagrass" : "bg-blue-400"} opacity-80`} />
                              </Tooltip>
                            )}
                            {itemBar?.kind === "marker" && (
                              <Tooltip
                                lines={[tChecklist(item.key), itemDateText]}
                                className="absolute flex items-center justify-center"
                                style={{ left: itemBar.left - 7, top: "50%", transform: "translateY(-50%)", width: 14 }}
                              >
                                <span className={`text-base leading-none select-none ${done ? "text-seagrass" : "text-blue-600"}`}>◆</span>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })}

            {/* Milestones row */}
            {milestones.length > 0 && (
              <div className="flex border-t-2 border-muted-teal/20 bg-purple-50/30" style={{ height: ROW_H }}>
                <div
                  style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
                  className="shrink-0 sticky left-0 bg-purple-50/60 z-10 border-r border-muted-teal/20 flex items-center px-3"
                >
                  <span className="text-xs font-semibold text-purple-700">{t("milestonesHeading")}</span>
                </div>
                <div className="relative flex-1">
                  {todayOffset >= 0 && (
                    <div className="absolute top-0 bottom-0 w-px bg-coral/50 z-10 pointer-events-none" style={{ left: todayOffset }} />
                  )}
                  {milestones.map((m) => {
                    if (!m.dueDate) return null;
                    const left = dayOffset(m.dueDate);
                    return (
                      <Tooltip
                        key={m.id}
                        lines={[m.title, formatDateSv(m.dueDate) ?? ""]}
                        className="absolute flex items-center justify-center"
                        style={{ left: left - 7, top: "50%", transform: "translateY(-50%)", width: 14 }}
                      >
                        <span className={`text-base leading-none select-none ${MILESTONE_MARKER_COLOR[m.timelineStatus]}`}>◆</span>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-dark-slate/70">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-seagrass" /> {t("statusCompleted")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {t("statusInProgress")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-watermelon" /> {t("statusAtRisk")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300" /> {t("statusUpcoming")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-purple-600">◆</span> {t("milestonesHeading")}
        </span>
      </div>
    </div>
  );
}

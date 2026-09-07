"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Tooltip from "@/components/Tooltip";
import { toDate, COLUMN_LABEL_KEYS, COLUMN_COLORS, type GanttCard } from "@/components/ganttShared";
import type { ProjectPhaseValue } from "@/lib/projectPhase";
import type { PhaseTimelineStatus } from "@/lib/roadmap";
import { upsertPhaseTarget } from "./actions";

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

interface RoadmapGanttProps {
  phases: GanttPhaseRow[];
  milestones: GanttMilestoneRow[];
  cards: GanttCard[];
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

// A kanban card "belongs to" a phase when its scheduled range overlaps the
// phase's start/target window. Only computed when both phase dates are set —
// an open-ended window would sweep in every future task, which isn't useful.
function tasksForPhase(phase: GanttPhaseRow, cards: GanttCard[]): GanttCard[] {
  if (!phase.startDate || !phase.targetDate) return [];
  return cards.filter((c) => {
    const s = toDate(c.startDate);
    const e = toDate(c.dueDate);
    const cardStart = s ?? e;
    const cardEnd = e ?? s;
    if (!cardStart || !cardEnd) return false;
    return cardStart <= phase.targetDate! && cardEnd >= phase.startDate!;
  });
}

export default function RoadmapGantt({ phases, milestones, cards, isOwnerOrAdmin, projectId, slug }: RoadmapGanttProps) {
  const t = useTranslations("RoadmapPage");
  const tGantt = useTranslations("GanttView");
  const [expanded, setExpanded] = useState<Set<ProjectPhaseValue>>(new Set());
  const [editingPhase, setEditingPhase] = useState<ProjectPhaseValue | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
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
  for (const c of cards) {
    const s = toDate(c.startDate);
    const e = toDate(c.dueDate);
    if (s) allDates.push(s);
    if (e) allDates.push(e);
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

  function phaseBar(p: GanttPhaseRow): Bar {
    if (p.startDate && p.targetDate) {
      return { kind: "bar", left: dayOffset(p.startDate), width: Math.max(diffDays(p.startDate, p.targetDate) + 1, 1) * DAY_WIDTH };
    }
    if (p.targetDate) {
      return { kind: "marker", left: dayOffset(p.targetDate) };
    }
    if (p.startDate) {
      const end = p.status === "completed" ? addDays(p.startDate, 14) : now > p.startDate ? now : addDays(p.startDate, 1);
      return { kind: "bar", left: dayOffset(p.startDate), width: Math.max(diffDays(p.startDate, end) + 1, 1) * DAY_WIDTH };
    }
    return null;
  }

  function cardBarLeft(card: GanttCard): number | null {
    const s = toDate(card.startDate);
    const e = toDate(card.dueDate);
    if (s) return dayOffset(s);
    if (e) return dayOffset(e);
    return null;
  }

  function cardBarWidth(card: GanttCard): number {
    const s = toDate(card.startDate);
    const e = toDate(card.dueDate);
    if (s && e) return Math.max(diffDays(s, e) + 1, 1) * DAY_WIDTH;
    return DAY_WIDTH;
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
            {phases.map((p) => {
              const bar = phaseBar(p);
              const isEditing = editingPhase === p.value;
              const canExpand = Boolean(p.startDate && p.targetDate);
              const isExpanded = expanded.has(p.value);
              const tasks = canExpand ? tasksForPhase(p, cards) : [];
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

                  {isExpanded && tasks.length === 0 && (
                    <div className="flex border-b border-muted-teal/10 bg-gray-50/40" style={{ minHeight: ROW_H }}>
                      <div
                        style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
                        className="shrink-0 sticky left-0 bg-gray-50/60 z-10 border-r border-muted-teal/20 flex items-center pl-7 pr-3"
                      >
                        <span className="text-[11px] text-dark-slate/30">{t("noTasksInPhase")}</span>
                      </div>
                      <div className="flex-1" style={{ minHeight: ROW_H }} />
                    </div>
                  )}

                  {isExpanded &&
                    tasks.map((card) => {
                      const left = cardBarLeft(card);
                      const width = cardBarWidth(card);
                      return (
                        <div key={card.id} className="flex border-b border-muted-teal/10 bg-gray-50/40" style={{ minHeight: ROW_H }}>
                          <div
                            style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
                            className="shrink-0 sticky left-0 bg-gray-50/60 z-10 border-r border-muted-teal/20 flex items-center pl-7 pr-3 gap-2"
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${COLUMN_COLORS[card.column]}`} />
                            <span className="text-xs truncate text-dark-slate/80" title={card.title}>
                              {card.title}
                            </span>
                          </div>
                          <div className="relative flex-1" style={{ minHeight: ROW_H }}>
                            {todayOffset >= 0 && (
                              <div className="absolute top-0 bottom-0 w-px bg-coral/50 z-10 pointer-events-none" style={{ left: todayOffset }} />
                            )}
                            {left !== null && (
                              <Tooltip
                                lines={[card.title, tGantt(COLUMN_LABEL_KEYS[card.column])]}
                                className="absolute top-1/2 -translate-y-1/2"
                                style={{ left, width }}
                              >
                                <div className={`w-full h-5 rounded ${COLUMN_COLORS[card.column]} opacity-80`} />
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

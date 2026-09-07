import Tooltip from "@/components/Tooltip";
import type { getTranslations } from "next-intl/server";
import type { ProjectPhaseValue } from "@/lib/projectPhase";
import type { PhaseTimelineStatus } from "@/lib/roadmap";

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
  t: Awaited<ReturnType<typeof getTranslations>>;
  tMonth: Awaited<ReturnType<typeof getTranslations>>;
}

const DAY_WIDTH = 8;
const LABEL_WIDTH = 220;
const PHASE_ROW_H = 60;
const MILESTONE_ROW_H = 36;

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

function formatDateSv(date: Date | null) {
  if (!date) return null;
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

export default function RoadmapGantt({ phases, milestones, t, tMonth }: RoadmapGanttProps) {
  const now = new Date();

  const allDates: Date[] = [now];
  for (const p of phases) {
    if (p.startDate) allDates.push(p.startDate);
    if (p.targetDate) allDates.push(p.targetDate);
  }
  for (const m of milestones) {
    if (m.dueDate) allDates.push(m.dueDate);
  }

  let rangeStart = addDays(new Date(Math.min(...allDates.map((d) => d.getTime()))), -14);
  let rangeEnd = addDays(new Date(Math.max(...allDates.map((d) => d.getTime()))), 30);
  if (diffDays(rangeStart, rangeEnd) < 120) rangeEnd = addDays(rangeStart, 120);
  rangeStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);

  const totalDays = diffDays(rangeStart, rangeEnd) + 1;
  const totalWidth = totalDays * DAY_WIDTH;

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
    monthSpans.push({ label: `${tMonth(MONTH_KEYS[cursor.getMonth()])} ${cursor.getFullYear()}`, days });
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

  return (
    <div className="rounded-lg border border-muted-teal/20 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: LABEL_WIDTH + totalWidth }}>
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

          {/* Phase rows */}
          {phases.map((p) => {
            const bar = phaseBar(p);
            const dateRangeText =
              p.startDate && p.targetDate
                ? `${formatDateSv(p.startDate)} – ${formatDateSv(p.targetDate)}`
                : p.targetDate
                ? `${t("targetDateLabel")}: ${formatDateSv(p.targetDate)}`
                : p.startDate
                ? `${t("startDateLabel")}: ${formatDateSv(p.startDate)}`
                : t("noTargetDateSet");

            return (
              <div key={p.value} className="flex border-b border-muted-teal/10" style={{ height: PHASE_ROW_H }}>
                <div
                  style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
                  className="shrink-0 sticky left-0 bg-white z-10 border-r border-muted-teal/20 flex flex-col justify-center px-3 py-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-dark-slate truncate">{p.label}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide shrink-0 ${
                      p.status === "at_risk" ? "text-watermelon" : p.status === "completed" ? "text-seagrass" : "text-dark-slate/40"
                    }`}>
                      {t(STATUS_LABEL_KEYS[p.status])}
                    </span>
                  </div>
                  <span className="text-[11px] text-dark-slate/50 mt-0.5 truncate">{dateRangeText}</span>
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
            );
          })}

          {/* Milestones row */}
          {milestones.length > 0 && (
            <div className="flex border-t-2 border-muted-teal/20 bg-purple-50/30" style={{ height: MILESTONE_ROW_H }}>
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
  );
}

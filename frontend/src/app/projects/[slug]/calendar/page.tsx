export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import type { Metadata } from "next";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: { title: true },
  });
  if (!project) return {};
  return { title: `${project.title} — Kalender — GoodTribes.org` };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEntry {
  id: string;
  title: string;
  type: "milestone" | "task" | "meeting" | "deadline" | "custom";
  color: string;
  href?: string;
}

const TYPE_COLORS: Record<CalendarEntry["type"], string> = {
  milestone: "bg-purple-500",
  task: "bg-blue-500",
  meeting: "bg-seagrass",
  deadline: "bg-watermelon",
  custom: "bg-amber-500",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 0=Mon … 6=Sun (ISO week) */
function getFirstWeekday(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  // JS: 0=Sun,1=Mon…6=Sat  →  ISO: 0=Mon…6=Sun
  return (d + 6) % 7;
}

function prevMonth(year: number, month: number): { year: number; month: number } {
  if (month === 0) return { year: year - 1, month: 11 };
  return { year, month: month - 1 };
}

function nextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 11) return { year: year + 1, month: 0 };
  return { year, month: month + 1 };
}

const MONTH_NAMES_SV = [
  "Januari",
  "Februari",
  "Mars",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "Augusti",
  "September",
  "Oktober",
  "November",
  "December",
];

const DAY_NAMES_SV = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const now = new Date();
  const year = sp.year ? parseInt(sp.year, 10) : now.getFullYear();
  const month = sp.month ? parseInt(sp.month, 10) - 1 : now.getMonth(); // searchParam is 1-based

  const [session, project] = await Promise.all([
    auth(),
    prisma.project.findUnique({
      where: { slug },
      select: { id: true, title: true },
    }),
  ]);
  if (!project) notFound();

  // Date range for this month
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  // Fetch all three data sources in parallel
  const [milestones, kanbanCards, calendarEvents] = await Promise.all([
    prisma.milestone.findMany({
      where: {
        projectId: project.id,
        dueDate: { gte: monthStart, lte: monthEnd },
      },
      select: { id: true, title: true, dueDate: true },
    }),
    prisma.kanbanCard.findMany({
      where: {
        projectSlug: slug,
        dueDate: { gte: monthStart, lte: monthEnd },
      },
      select: { id: true, title: true, dueDate: true },
    }),
    prisma.calendarEvent.findMany({
      where: {
        projectSlug: slug,
        startsAt: { gte: monthStart, lte: monthEnd },
      },
      select: {
        id: true,
        title: true,
        type: true,
        startsAt: true,
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  // Build dayEvents map: day number → CalendarEntry[]
  const dayEvents: Record<number, CalendarEntry[]> = {};

  function addEntry(day: number, entry: CalendarEntry) {
    if (!dayEvents[day]) dayEvents[day] = [];
    dayEvents[day].push(entry);
  }

  for (const m of milestones) {
    if (!m.dueDate) continue;
    const day = m.dueDate.getDate();
    addEntry(day, {
      id: m.id,
      title: m.title,
      type: "milestone",
      color: TYPE_COLORS.milestone,
      href: `/projects/${slug}/milestones`,
    });
  }

  for (const c of kanbanCards) {
    if (!c.dueDate) continue;
    const day = c.dueDate.getDate();
    addEntry(day, {
      id: c.id,
      title: c.title,
      type: "task",
      color: TYPE_COLORS.task,
      href: `/projects/${slug}/kanban`,
    });
  }

  for (const e of calendarEvents) {
    const day = e.startsAt.getDate();
    const knownTypes: string[] = ["milestone", "task", "meeting", "deadline", "custom"];
    const type: CalendarEntry["type"] = knownTypes.includes(e.type)
      ? (e.type as CalendarEntry["type"])
      : "custom";
    addEntry(day, {
      id: e.id,
      title: e.title,
      type,
      color: TYPE_COLORS[type],
    });
  }

  // Calendar grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month); // 0=Mon
  const prev = prevMonth(year, month);
  const next = nextMonth(year, month);

  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDay = now.getDate();
  const isCurrentMonth = todayYear === year && todayMonth === month;

  // Build array of cells: null = empty leading/trailing cell
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ...Array(totalCells - firstWeekday - daysInMonth).fill(null),
  ];

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div>
      {/* Back link + heading */}
      <div className="mb-4">
        <Link
          href={`/projects/${slug}`}
          className="text-xs text-dark-slate/40 hover:text-dark-slate transition-colors"
        >
          ← {project.title}
        </Link>
        <h1 className="text-xl font-bold text-dark-slate mt-0.5">Kalender</h1>
      </div>

      {/* Month navigation + new event button */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Link
            href={`?year=${prev.year}&month=${prev.month + 1}`}
            className="p-1.5 rounded hover:bg-muted-teal/20 transition-colors text-dark-slate/60 hover:text-dark-slate"
            aria-label="Föregående månad"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <span className="text-base font-semibold text-dark-slate min-w-[10rem] text-center">
            {MONTH_NAMES_SV[month]} {year}
          </span>

          <Link
            href={`?year=${next.year}&month=${next.month + 1}`}
            className="p-1.5 rounded hover:bg-muted-teal/20 transition-colors text-dark-slate/60 hover:text-dark-slate"
            aria-label="Nästa månad"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {session?.user?.id && (
          <Link
            href={`/projects/${slug}/calendar/new`}
            className="flex items-center gap-1.5 bg-coral text-white text-sm font-medium px-4 py-1.5 rounded hover:bg-watermelon transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ny händelse
          </Link>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs text-dark-slate/70">
        <span className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${TYPE_COLORS.milestone}`} />
          Milstolpe
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${TYPE_COLORS.task}`} />
          Uppgift
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${TYPE_COLORS.meeting}`} />
          Möte
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${TYPE_COLORS.deadline}`} />
          Deadline
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${TYPE_COLORS.custom}`} />
          Anpassad
        </span>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[320px]">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES_SV.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-medium text-dark-slate/50 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="border border-muted-teal/20 rounded-lg overflow-hidden">
            {weeks.map((week, wi) => (
              <div
                key={wi}
                className={`grid grid-cols-7 ${wi < weeks.length - 1 ? "border-b border-muted-teal/20" : ""}`}
              >
                {week.map((day, di) => {
                  const isToday = isCurrentMonth && day === todayDay;
                  const entries = day ? (dayEvents[day] ?? []) : [];
                  const visible = entries.slice(0, 3);
                  const overflow = entries.length - 3;

                  return (
                    <div
                      key={di}
                      className={`min-h-[72px] sm:min-h-[88px] p-1 sm:p-1.5 ${
                        di < 6 ? "border-r border-muted-teal/20" : ""
                      } ${day ? "bg-white" : "bg-gray-50/60"}`}
                    >
                      {day !== null && (
                        <>
                          {/* Day number */}
                          <div className="flex justify-end mb-1">
                            <span
                              className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                                isToday
                                  ? "bg-coral text-white"
                                  : "text-dark-slate/70"
                              }`}
                            >
                              {day}
                            </span>
                          </div>

                          {/* Event chips */}
                          <div className="space-y-0.5">
                            {visible.map((entry) =>
                              entry.href ? (
                                <Link
                                  key={entry.id}
                                  href={entry.href}
                                  className={`block truncate text-[10px] sm:text-xs leading-none rounded px-1 py-0.5 text-white ${entry.color} hover:opacity-80 transition-opacity`}
                                  title={entry.title}
                                >
                                  {entry.title}
                                </Link>
                              ) : (
                                <div
                                  key={entry.id}
                                  className={`block truncate text-[10px] sm:text-xs leading-none rounded px-1 py-0.5 text-white ${entry.color}`}
                                  title={entry.title}
                                >
                                  {entry.title}
                                </div>
                              )
                            )}
                            {overflow > 0 && (
                              <div className="text-[10px] text-dark-slate/40 px-1 leading-none">
                                +{overflow} fler
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

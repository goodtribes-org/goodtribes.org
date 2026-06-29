export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { Metadata } from "next";
import GanttView from "@/components/GanttView";
import { createMilestone, toggleMilestone, deleteMilestone } from "../milestones/actions";


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
  return { title: `${project.title} — Planering — GoodTribes.org` };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEntry {
  id: string;
  title: string;
  type: "milestone" | "task" | "todo" | "meeting" | "deadline" | "custom";
  color: string;
  href?: string;
}

const TYPE_COLORS: Record<CalendarEntry["type"], string> = {
  milestone: "bg-purple-500",
  task: "bg-blue-500",
  todo: "bg-amber-500",
  meeting: "bg-seagrass",
  deadline: "bg-watermelon",
  custom: "bg-gray-400",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstWeekday(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
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

function formatDateSv(date: Date | null) {
  if (!date) return null;
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(date: Date | null, status: string) {
  if (!date || status === "done") return false;
  return date < new Date();
}

const MONTH_NAMES_SV = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

const DAY_NAMES_SV = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ year?: string; month?: string; view?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const view = sp.view === "gantt" ? "gantt" : "calendar";
  const now = new Date();
  const year = sp.year ? parseInt(sp.year, 10) : now.getFullYear();
  const month = sp.month ? parseInt(sp.month, 10) - 1 : now.getMonth();

  const [session, project] = await Promise.all([
    auth(),
    prisma.project.findUnique({
      where: { slug },
      select: { id: true, title: true },
    }),
  ]);
  if (!project) notFound();

  const memberRow = session?.user?.id
    ? await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: project.id, userId: session.user.id } },
        select: { role: true },
      })
    : null;
  const isOwnerOrAdmin = memberRow?.role === "owner" || memberRow?.role === "admin";

  // Date range for calendar month
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  // Fetch calendar data + milestones (all) + all kanban cards + todos for Gantt
  const [milestones, kanbanCardsMonth, calendarEvents, todoItemsMonth, allMilestones, allKanbanCards, allTodoItems] = await Promise.all([
    // Calendar: milestones in this month
    prisma.milestone.findMany({
      where: { projectId: project.id, dueDate: { gte: monthStart, lte: monthEnd } },
      select: { id: true, title: true, dueDate: true },
    }),
    // Calendar: kanban cards due this month
    prisma.kanbanCard.findMany({
      where: { projectSlug: slug, dueDate: { gte: monthStart, lte: monthEnd } },
      select: { id: true, title: true, dueDate: true },
    }),
    // Calendar: events this month
    prisma.calendarEvent.findMany({
      where: { projectSlug: slug, startsAt: { gte: monthStart, lte: monthEnd } },
      select: { id: true, title: true, type: true, startsAt: true, createdBy: { select: { name: true } } },
    }),
    // Calendar: todo items due this month
    prisma.todoItem.findMany({
      where: { list: { projectSlug: slug }, dueDate: { gte: monthStart, lte: monthEnd } },
      select: { id: true, title: true, dueDate: true },
    }),
    // Milestones section: all milestones
    prisma.milestone.findMany({
      where: { projectId: project.id },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
    }),
    // Gantt: all kanban cards
    prisma.kanbanCard.findMany({
      where: { projectSlug: slug },
      select: { id: true, title: true, column: true, priority: true, startDate: true, dueDate: true },
      orderBy: [{ column: "asc" }, { order: "asc" }],
    }),
    // Gantt: all todo items
    prisma.todoItem.findMany({
      where: { list: { projectSlug: slug } },
      select: { id: true, title: true, dueDate: true, done: true },
      orderBy: { order: "asc" },
    }),
  ]);

  // ─── Calendar grid data ────────────────────────────────────────────────────

  const dayEvents: Record<number, CalendarEntry[]> = {};
  function addEntry(day: number, entry: CalendarEntry) {
    if (!dayEvents[day]) dayEvents[day] = [];
    dayEvents[day].push(entry);
  }

  for (const m of milestones) {
    if (!m.dueDate) continue;
    addEntry(m.dueDate.getDate(), { id: m.id, title: m.title, type: "milestone", color: TYPE_COLORS.milestone });
  }
  for (const c of kanbanCardsMonth) {
    if (!c.dueDate) continue;
    addEntry(c.dueDate.getDate(), {
      id: c.id, title: c.title, type: "task", color: TYPE_COLORS.task,
      href: `/projects/${slug}/kanban`,
    });
  }
  for (const e of calendarEvents) {
    const knownTypes: string[] = ["milestone", "task", "meeting", "deadline", "custom"];
    const type: CalendarEntry["type"] = knownTypes.includes(e.type) ? (e.type as CalendarEntry["type"]) : "custom";
    addEntry(e.startsAt.getDate(), { id: e.id, title: e.title, type, color: TYPE_COLORS[type] });
  }
  for (const t of todoItemsMonth) {
    if (!t.dueDate) continue;
    addEntry(t.dueDate.getDate(), {
      id: t.id, title: t.title, type: "todo", color: TYPE_COLORS.todo,
      href: `/projects/${slug}/todos`,
    });
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);
  const prev = prevMonth(year, month);
  const next = nextMonth(year, month);
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDay = now.getDate();
  const isCurrentMonth = todayYear === year && todayMonth === month;

  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ...Array(totalCells - firstWeekday - daysInMonth).fill(null),
  ];
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // ─── Milestones section data ───────────────────────────────────────────────
  const doneMilestones = allMilestones.filter((m) => m.status === "done").length;
  const totalMilestones = allMilestones.length;
  const milestonePct = totalMilestones > 0 ? Math.round((doneMilestones / totalMilestones) * 100) : 0;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Calendar view ─────────────────────────────────────────────────── */}
      {view === "calendar" && (
        <>
          {/* Toolbar: Ny händelse | månad nav | kalender/gantt toggle */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {session?.user?.id && (
              <Link
                href={`/projects/${slug}/calendar/new`}
                className="flex items-center gap-1.5 bg-coral text-white text-sm font-medium px-4 py-1.5 rounded hover:bg-watermelon transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ny händelse
              </Link>
            )}
            <div className="flex items-center gap-2">
              <Link
                href={`?view=calendar&year=${prev.year}&month=${prev.month + 1}`}
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
                href={`?view=calendar&year=${next.year}&month=${next.month + 1}`}
                className="p-1.5 rounded hover:bg-muted-teal/20 transition-colors text-dark-slate/60 hover:text-dark-slate"
                aria-label="Nästa månad"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Link
                href={`?view=calendar&year=${year}&month=${month + 1}`}
                className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors bg-white text-dark-slate shadow-sm"
              >
                Kalender
              </Link>
              <Link
                href="?view=gantt"
                className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors text-dark-slate/50 hover:text-dark-slate"
              >
                Gantt
              </Link>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4 text-xs text-dark-slate/70">
            {(["milestone", "task", "todo", "meeting", "deadline", "custom"] as const).map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${TYPE_COLORS[t]}`} />
                {{ milestone: "Milstolpe", task: "Kanban", todo: "Todo", meeting: "Möte", deadline: "Deadline", custom: "Anpassad" }[t]}
              </span>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[320px]">
              <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES_SV.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-dark-slate/50 py-1">{d}</div>
                ))}
              </div>
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
                              <div className="flex justify-end mb-1">
                                <span
                                  className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                                    isToday ? "bg-coral text-white" : "text-dark-slate/70"
                                  }`}
                                >
                                  {day}
                                </span>
                              </div>
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

          {/* ── Milestones section ─────────────────────────────────────────── */}
          <div className="mt-10">
            <h2 className="text-base font-bold text-dark-slate mb-4">Milstolpar</h2>

            {totalMilestones > 0 && (
              <div className="mb-5">
                <div className="flex justify-between text-xs text-dark-slate/60 mb-1.5">
                  <span>{doneMilestones} av {totalMilestones} slutförda</span>
                  <span>{milestonePct}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-seagrass transition-all" style={{ width: `${milestonePct}%` }} />
                </div>
              </div>
            )}

            <div className="space-y-2 mb-6">
              {allMilestones.length === 0 && (
                <p className="text-sm text-dark-slate/40 py-4 text-center">Inga milstolpar ännu.</p>
              )}
              {allMilestones.map((m) => {
                const overdue = isOverdue(m.dueDate, m.status);
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      m.status === "done"
                        ? "border-seagrass/30 bg-seagrass/5"
                        : overdue
                        ? "border-watermelon/30 bg-watermelon/5"
                        : "border-muted-teal/30 bg-white"
                    }`}
                  >
                    {isOwnerOrAdmin ? (
                      <form action={toggleMilestone.bind(null, m.id, slug)}>
                        <button
                          type="submit"
                          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            m.status === "done"
                              ? "bg-seagrass border-seagrass"
                              : "border-gray-300 hover:border-seagrass"
                          }`}
                        >
                          {m.status === "done" && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      </form>
                    ) : (
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          m.status === "done" ? "bg-seagrass border-seagrass" : "border-gray-300"
                        }`}
                      >
                        {m.status === "done" && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-snug ${m.status === "done" ? "line-through text-dark-slate/50" : "text-dark-slate"}`}>
                        {m.title}
                      </p>
                      {m.description && (
                        <p className="text-xs text-dark-slate/60 mt-0.5">{m.description}</p>
                      )}
                      {m.dueDate && (
                        <p className={`text-xs mt-1 ${overdue ? "text-watermelon font-medium" : "text-dark-slate/40"}`}>
                          {overdue ? "Försenad — " : "Förfaller "}
                          {formatDateSv(m.dueDate)}
                        </p>
                      )}
                    </div>

                    {isOwnerOrAdmin && (
                      <form action={deleteMilestone.bind(null, m.id, slug)}>
                        <button
                          type="submit"
                          className="text-xs text-dark-slate/20 hover:text-watermelon transition-colors mt-0.5"
                          aria-label="Ta bort milstolpe"
                        >
                          ✕
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>

            {isOwnerOrAdmin && (
              <div className="border border-muted-teal/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-dark-slate mb-3">Lägg till milstolpe</h3>
                <form action={createMilestone.bind(null, project.id, slug)} className="space-y-3">
                  <input
                    name="title"
                    type="text"
                    required
                    placeholder="Milstolpens titel"
                    className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      name="description"
                      type="text"
                      placeholder="Beskrivning (valfritt)"
                      className="border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
                    />
                    <input
                      name="dueDate"
                      type="date"
                      className="border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-coral text-white text-sm font-medium px-4 py-2 rounded hover:bg-watermelon transition-colors"
                  >
                    Lägg till
                  </button>
                </form>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Gantt view ────────────────────────────────────────────────────── */}
      {view === "gantt" && (
        <>
          {/* Toolbar: toggle only */}
          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Link
                href={`?view=calendar&year=${year}&month=${month + 1}`}
                className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors text-dark-slate/50 hover:text-dark-slate"
              >
                Kalender
              </Link>
              <Link
                href="?view=gantt"
                className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors bg-white text-dark-slate shadow-sm"
              >
                Gantt
              </Link>
            </div>
          </div>
          {allKanbanCards.length === 0 && allTodoItems.length === 0 ? (
            <p className="text-sm text-dark-slate/40 py-8 text-center">Inga uppgifter ännu.</p>
          ) : (
            <div style={{ marginLeft: "calc(50% - 50vw)", width: "100vw", paddingLeft: "1.5rem", paddingRight: "1.5rem" }}>
              <GanttView
                cards={allKanbanCards}
                todos={allTodoItems}
                milestones={allMilestones.map((m) => ({
                  id: m.id,
                  title: m.title,
                  dueDate: m.dueDate,
                  status: m.status,
                }))}
                projectSlug={slug}
                isOwnerOrAdmin={isOwnerOrAdmin}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

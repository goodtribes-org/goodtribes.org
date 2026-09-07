export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { isLeadRole } from "@/lib/authz";
import { calculateMaturityScore } from "@/lib/projectMaturity";
import { DISPLAY_PHASES } from "@/lib/projectPhase";
import { getPhaseTimelineStatus, getMilestoneTimelineStatus } from "@/lib/roadmap";
import RoadmapGantt, { type GanttPhaseRow, type GanttMilestoneRow } from "./RoadmapGantt";
import { upsertPhaseTarget } from "./actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const [project, t] = await Promise.all([
    prisma.project.findUnique({ where: { slug }, select: { title: true } }),
    getTranslations({ locale, namespace: "RoadmapPage" }),
  ]);
  if (!project) return {};
  return { title: t("pageTitle", { projectTitle: project.title }) };
}

function formatDateSv(date: Date | null) {
  if (!date) return null;
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const [t, tMonth] = await Promise.all([
    getTranslations({ locale, namespace: "RoadmapPage" }),
    getTranslations({ locale, namespace: "GanttView" }),
  ]);

  const [session, project] = await Promise.all([
    auth(),
    prisma.project.findUnique({
      where: { slug },
      select: { id: true, title: true, phase: true },
    }),
  ]);
  if (!project) notFound();

  const memberRow = session?.user?.id
    ? await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: project.id, userId: session.user.id } },
        select: { role: true },
      })
    : null;
  const isOwnerOrAdmin = isLeadRole(memberRow?.role);

  const [phaseTargets, milestones, maturityScore] = await Promise.all([
    prisma.phaseTarget.findMany({ where: { projectId: project.id } }),
    prisma.milestone.findMany({
      where: { projectId: project.id },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
    }),
    calculateMaturityScore(slug),
  ]);

  const targetsByPhase = new Map(phaseTargets.map((pt) => [pt.phase, pt]));

  const ganttPhases: GanttPhaseRow[] = DISPLAY_PHASES.map((phaseDef) => {
    const target = targetsByPhase.get(phaseDef.value);
    return {
      value: phaseDef.value,
      label: phaseDef.label,
      status: getPhaseTimelineStatus({
        phaseValue: phaseDef.value,
        currentPhase: project.phase,
        targetDate: target?.targetDate ?? null,
      }),
      startDate: target?.startDate ?? null,
      targetDate: target?.targetDate ?? null,
    };
  });

  const ganttMilestones: GanttMilestoneRow[] = milestones.map((m) => ({
    id: m.id,
    title: m.title,
    dueDate: m.dueDate,
    timelineStatus: getMilestoneTimelineStatus(m.dueDate, m.status),
  }));

  return (
    <div className="max-w-5xl">
      <h1 className="text-lg font-bold text-dark-slate mb-1">{t("pageTitle", { projectTitle: project.title })}</h1>

      {/* ── Maturity score ─────────────────────────────────────────────── */}
      <section className="bg-white border border-muted-teal/30 rounded-xl p-4 mb-6 flex items-center justify-between max-w-3xl">
        <h2 className="text-sm font-semibold text-dark-slate">{t("maturityScoreHeading")}</h2>
        <span className="text-2xl font-bold text-coral">{maturityScore}</span>
      </section>

      {/* ── Phase + milestone Gantt chart ──────────────────────────────── */}
      <section className="mb-4">
        <h2 className="text-base font-bold text-dark-slate mb-3">{t("phaseTimelineHeading")}</h2>
        <RoadmapGantt phases={ganttPhases} milestones={ganttMilestones} t={t} tMonth={tMonth} />
      </section>

      {/* ── Edit target dates (leads/admins only) ──────────────────────── */}
      {isOwnerOrAdmin && (
        <section className="mb-8 max-w-3xl">
          <h3 className="text-sm font-semibold text-dark-slate/70 mb-2">{t("editDatesHeading")}</h3>
          <div className="space-y-1.5">
            {ganttPhases.map((p) => (
              <form
                key={p.value}
                action={upsertPhaseTarget.bind(null, project.id, slug, p.value)}
                className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-muted-teal/20 bg-white"
              >
                <span className="text-xs font-medium text-dark-slate w-24 shrink-0">{p.label}</span>
                <label className="flex items-center gap-1 text-xs text-dark-slate/60">
                  {t("startDateLabel")}
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={toDateInputValue(p.startDate)}
                    className="border border-muted-teal/30 rounded px-1.5 py-0.5 text-xs"
                  />
                </label>
                <label className="flex items-center gap-1 text-xs text-dark-slate/60">
                  {t("targetDateLabel")}
                  <input
                    type="date"
                    name="targetDate"
                    defaultValue={toDateInputValue(p.targetDate)}
                    className="border border-muted-teal/30 rounded px-1.5 py-0.5 text-xs"
                  />
                </label>
                <button
                  type="submit"
                  className="bg-coral text-white text-xs font-medium px-3 py-1 rounded hover:bg-watermelon transition-colors ml-auto"
                >
                  {t("saveDatesButton")}
                </button>
              </form>
            ))}
          </div>
        </section>
      )}

      {/* ── Milestones ──────────────────────────────────────────────────── */}
      <section className="max-w-3xl">
        <h2 className="text-base font-bold text-dark-slate mb-3">{t("milestonesHeading")}</h2>
        <div className="space-y-2">
          {milestones.length === 0 && (
            <p className="text-sm text-dark-slate/40 py-4 text-center">{t("noMilestonesYet")}</p>
          )}
          {milestones.map((m) => {
            const timelineStatus = getMilestoneTimelineStatus(m.dueDate, m.status);
            return (
              <div
                key={m.id}
                className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${
                  timelineStatus === "done"
                    ? "border-seagrass/30 bg-seagrass/5"
                    : timelineStatus === "overdue"
                    ? "border-watermelon/30 bg-watermelon/5"
                    : "border-muted-teal/30 bg-white"
                }`}
              >
                <div className="min-w-0">
                  <p className={`text-sm font-medium leading-snug ${m.status === "done" ? "line-through text-dark-slate/50" : "text-dark-slate"}`}>
                    {m.title}
                  </p>
                  {m.dueDate && (
                    <p className={`text-xs mt-1 ${timelineStatus === "overdue" ? "text-watermelon font-medium" : "text-dark-slate/40"}`}>
                      {timelineStatus === "overdue" ? t("overdueLabel") : t("dueLabel")}
                      {formatDateSv(m.dueDate)}
                    </p>
                  )}
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide shrink-0 text-dark-slate/50">
                  {t(
                    timelineStatus === "done"
                      ? "statusCompleted"
                      : timelineStatus === "overdue"
                      ? "statusAtRisk"
                      : "statusUpcoming"
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

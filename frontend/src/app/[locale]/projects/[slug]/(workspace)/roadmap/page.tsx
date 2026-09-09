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
import WorkspacePageHeader from "@/components/WorkspacePageHeader";

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

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const t = await getTranslations({ locale, namespace: "RoadmapPage" });

  const [session, project] = await Promise.all([
    auth(),
    prisma.project.findUnique({
      where: { slug },
      select: { id: true, phase: true },
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

  const [phaseTargets, milestones, checklistItems, maturityScore] = await Promise.all([
    prisma.phaseTarget.findMany({ where: { projectId: project.id } }),
    prisma.milestone.findMany({
      where: { projectId: project.id },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.initiativeChecklistItem.findMany({
      where: { projectId: project.id },
      select: { itemKey: true, completedAt: true, startDate: true, dueDate: true },
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
    <div>
      <WorkspacePageHeader title={t("pageHeading")} help={t("helpText")} />

      {/* ── Maturity score ─────────────────────────────────────────────── */}
      <section className="bg-white border border-muted-teal/30 rounded-xl p-4 mb-6 flex items-center justify-between max-w-3xl">
        <h2 className="text-sm font-semibold text-dark-slate">{t("maturityScoreHeading")}</h2>
        <span className="text-2xl font-bold text-coral">{maturityScore}</span>
      </section>

      {/* ── Phase + milestone Gantt chart ──────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-base font-bold text-dark-slate mb-3">{t("phaseTimelineHeading")}</h2>
        <RoadmapGantt
          phases={ganttPhases}
          milestones={ganttMilestones}
          checklistItems={checklistItems.map((c) => ({
            itemKey: c.itemKey,
            done: c.completedAt !== null,
            startDate: c.startDate,
            dueDate: c.dueDate,
          }))}
          isOwnerOrAdmin={isOwnerOrAdmin}
          projectId={project.id}
          slug={slug}
        />
      </section>

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

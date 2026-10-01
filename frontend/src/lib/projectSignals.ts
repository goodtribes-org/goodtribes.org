import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { autoDoneKeys, type ProjectSignals } from "@/lib/phaseProgress";
import { LEAN_CANVAS_BLOCKS } from "@/app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
import { VALUE_PROPOSITION_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/value-proposition/fields";

const filled = (row: Record<string, unknown> | null | undefined, fields: readonly string[]) =>
  fields.filter((f) => typeof row?.[f] === "string" && (row[f] as string).trim()).length;

// The project data behind the phase bars' automatic ticks (see
// lib/phaseProgress.ts). A handful of counts in one round of parallel
// queries, deduplicated per request by React's cache() — the project page
// renders both the phase bar and the checklist widget from it.
export const getProjectSignals = cache(async (projectId: string, slug: string): Promise<ProjectSignals> => {
  const [
    project, activeMemberCount, inviteCount, interviewCount, marketScanCount, kanbanCardCount, sprints,
    testFeedbackCount, roles, evaluation, pilotGate, impactMetricCount, launch, pages, campaign, applications,
    activePartnerships, councilReview, scalingPlan, instances, reports, followup,
  ] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: {
        summary: true,
        description: true,
        sdgGoals: true,
        estimatedFundingNeedSek: true,
        leanCanvas: true,
        valueProposition: true,
        dreamConversation: { select: { status: true } },
        openForReplication: true,
      },
    }),
    prisma.projectMember.count({ where: { projectId, role: { not: "FOLLOWER" } } }),
    prisma.projectInvite.count({ where: { projectId } }),
    prisma.interviewLogEntry.count({ where: { projectSlug: slug } }),
    prisma.marketScanEntry.count({ where: { projectSlug: slug } }),
    prisma.kanbanCard.count({ where: { projectSlug: slug } }),
    prisma.sprint.findMany({ where: { projectSlug: slug }, select: { phases: { where: { status: "CLOSED" }, select: { phase: true } } } }),
    prisma.sprintContribution.count({ where: { type: "FEEDBACK", sprintPhase: { phase: "VALIDATE", sprint: { projectSlug: slug } } } }),
    prisma.projectRoleNeed.findMany({ where: { projectId }, select: { filledById: true } }),
    prisma.pilotEvaluation.findUnique({ where: { projectSlug: slug }, select: { successCriteria: true, executionNotes: true, resultsSummary: true } }),
    prisma.phaseGateDecision.findFirst({ where: { projectId, fromPhase: "PRODUCTION" }, select: { id: true } }),
    prisma.impactMetric.count({ where: { projectSlug: slug } }),
    prisma.launchPlan.findUnique({ where: { projectSlug: slug }, select: { targetAudience: true, positioning: true } }),
    prisma.wikiPage.findMany({ where: { projectSlug: slug, slug: { in: ["arbetsfloden", "playbook"] } }, select: { slug: true } }),
    prisma.fundingCampaign.findUnique({ where: { projectId }, select: { id: true, _count: { select: { pledges: { where: { pledgeStatus: "confirmed" } } } } } }),
    prisma.fundingApplication.findMany({ where: { projectId, status: { in: ["submitted", "awarded"] } }, select: { status: true } }),
    prisma.partnership.count({ where: { projectId, status: "active" } }),
    prisma.reviewCouncilRequest.findFirst({ where: { projectId, status: "completed" }, select: { id: true } }),
    prisma.scalingPlan.findUnique({ where: { projectSlug: slug }, select: { goals: true, geographies: true } }),
    prisma.projectInstance.findMany({ where: { parentSlug: slug }, select: { status: true } }),
    prisma.impactReport.findMany({ where: { projectId, kind: "DELIVERED", rejectedAt: null }, select: { verifiedAt: true } }),
    prisma.impactFollowup.findUnique({ where: { projectSlug: slug }, select: { celebrationNotes: true } }),
  ]);
  const pageSlugs = new Set(pages.map((p) => p.slug));
  const awarded = applications.some((a) => a.status === "awarded");
  return {
    dreamConfirmed: project?.dreamConversation?.status === "confirmed",
    hasSummaryAndDescription: !!project?.summary?.trim() && !!project?.description?.trim(),
    sdgCount: project?.sdgGoals.length ?? 0,
    activeMemberCount,
    inviteCount,
    leanCanvasFilled: filled(project?.leanCanvas as Record<string, unknown> | null, LEAN_CANVAS_BLOCKS.map((b) => b.field)),
    valuePropositionFilled: filled(project?.valueProposition as Record<string, unknown> | null, VALUE_PROPOSITION_FIELDS),
    interviewCount,
    marketScanCount,
    kanbanCardCount,
    sprintCount: sprints.length,
    closedSprintSteps: [...new Set(sprints.flatMap((s) => s.phases.map((p) => p.phase)))],
    fundingNeedSet: project?.estimatedFundingNeedSek != null,
    testFeedbackCount,
    allRolesFilled: roles.length > 0 && roles.every((r) => r.filledById),
    pilotSuccessCriteria: !!evaluation?.successCriteria?.trim(),
    pilotLogEntries: (evaluation?.executionNotes ?? "").split("\n").filter((l) => l.trim()).length,
    pilotResultsSummary: !!evaluation?.resultsSummary?.trim(),
    pilotGateDecided: !!pilotGate,
    impactMetricCount,
    launchPlanWritten: !!(launch?.targetAudience?.trim() || launch?.positioning?.trim()),
    workflowsPage: pageSlugs.has("arbetsfloden"),
    fundingApplied: !!campaign || applications.length > 0,
    fundingSecured: awarded || (campaign?._count.pledges ?? 0) > 0,
    activePartnerships,
    playbookPage: pageSlugs.has("playbook"),
    councilReviewCompleted: !!councilReview,
    replicationOpened: !!project?.openForReplication || instances.length > 0,
    scalingGoalsWritten: !!scalingPlan?.goals?.trim(),
    geographiesWritten: !!scalingPlan?.geographies?.trim(),
    fundingAwarded: awarded,
    approvedInstance: instances.some((i) => i.status === "approved"),
    deliveredReports: reports.length,
    verifiedDeliveredReports: reports.filter((r) => r.verifiedAt).length,
    celebrationWritten: !!followup?.celebrationNotes?.trim(),
  };
});

export async function getAutoDoneKeys(projectId: string, slug: string): Promise<string[]> {
  return autoDoneKeys(await getProjectSignals(projectId, slug));
}

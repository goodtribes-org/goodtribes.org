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
  const [project, activeMemberCount, inviteCount, interviewCount, marketScanCount, kanbanCardCount, sprints] = await Promise.all([
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
      },
    }),
    prisma.projectMember.count({ where: { projectId, role: { not: "FOLLOWER" } } }),
    prisma.projectInvite.count({ where: { projectId } }),
    prisma.interviewLogEntry.count({ where: { projectSlug: slug } }),
    prisma.marketScanEntry.count({ where: { projectSlug: slug } }),
    prisma.kanbanCard.count({ where: { projectSlug: slug } }),
    prisma.sprint.findMany({ where: { projectSlug: slug }, select: { phases: { where: { status: "CLOSED" }, select: { phase: true } } } }),
  ]);
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
  };
});

export async function getAutoDoneKeys(projectId: string, slug: string): Promise<string[]> {
  return autoDoneKeys(await getProjectSignals(projectId, slug));
}

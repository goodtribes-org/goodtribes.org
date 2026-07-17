import { prisma } from "@/lib/prisma";
import type { FlagStatus } from "@prisma/client";

export type EntityFlagOutcome = "dismissed" | "warned" | "removed";

// Shared review logic for whole-entity ContentFlag rows (targetType Project
// or Organisation) — the unified counterpart to the legacy reviewFlag
// (ProjectFlag) / reviewOrgFlag (OrganisationFlag) actions, which still exist
// for the historical rows that predate the ContentFlag-based flow (see
// prisma/migrations/20260717180000_unify_flagging_content_flag_links).
// Reuses the same per-entity "removed" semantics those legacy actions
// already established: projects are hard-deleted, organisations are
// unpublished (deleting an org would orphan any Project.orgId pointing at it).
export async function reviewEntityContentFlag(
  contentFlagId: string,
  targetType: "Project" | "Organisation",
  targetId: string,
  reviewerId: string,
  outcome: EntityFlagOutcome,
  note?: string
): Promise<void> {
  const status: FlagStatus = outcome === "dismissed" ? "DISMISSED" : "ACTIONED";

  await prisma.contentFlag.update({
    where: { id: contentFlagId },
    data: { status, reviewedById: reviewerId, decisionNote: note ?? null, reviewedAt: new Date() },
  });

  if (targetType === "Project") {
    await prisma.ethicsReview.create({
      data: { projectId: targetId, reviewerId, contentFlagId, outcome, note: note ?? null },
    });
    if (outcome === "removed") {
      await prisma.project.delete({ where: { id: targetId } });
    }
  } else {
    await prisma.organisationEthicsReview.create({
      data: { organisationId: targetId, reviewerId, contentFlagId, outcome, note: note ?? null },
    });
    if (outcome === "removed") {
      await prisma.organisation.update({ where: { id: targetId }, data: { isPublic: false, verified: false } });
    }
  }
}

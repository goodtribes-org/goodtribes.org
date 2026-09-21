import { prisma } from "@/lib/prisma";
import { registerOutboxHandler, enqueueOutboxEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notify";
import { logger } from "@/lib/logger";
import type { FundingSource, LegalType, Prisma } from "@prisma/client";

// Callers trigger matching through these two functions rather than calling
// enqueueOutboxEvent directly -- importing this module is what guarantees
// the registerOutboxHandler calls below have actually run (same reasoning
// as notify.ts: the registration and the public trigger function live in
// the same file, so one can't be reached without the other).
export async function enqueueFundingSourceAddedMatch(
  fundingSourceId: string,
  tx: typeof prisma | Prisma.TransactionClient = prisma
) {
  await enqueueOutboxEvent(tx, "funding.sourceAdded", { fundingSourceId });
}

export async function enqueueProjectUpdatedFundingMatch(
  projectId: string,
  tx: typeof prisma | Prisma.TransactionClient = prisma
) {
  await enqueueOutboxEvent(tx, "funding.projectUpdated", { projectId });
}

type MatchableProject = {
  id: string;
  slug: string;
  title: string;
  sdgGoals: number[];
  legalType: LegalType;
  estimatedFundingNeedSek: number | null;
  hiddenAt: Date | null;
};

// Empty list on the source side always means "no restriction" -- a source
// with no SDG tags or no legal-type restriction is assumed to fit any
// project on that dimension. Amount range only excludes a project when BOTH
// sides have real numbers to compare; missing data is never itself a reason
// to reject a match.
function isMatch(source: FundingSource, project: MatchableProject): boolean {
  if (project.hiddenAt) return false;

  if (source.sdgGoals.length > 0) {
    const overlaps = project.sdgGoals.some((g) => source.sdgGoals.includes(g));
    if (!overlaps) return false;
  }

  if (source.eligibleLegalTypes.length > 0 && !source.eligibleLegalTypes.includes(project.legalType)) {
    return false;
  }

  if (project.estimatedFundingNeedSek != null) {
    if (source.minAmountSek != null && project.estimatedFundingNeedSek < source.minAmountSek) return false;
    if (source.maxAmountSek != null && project.estimatedFundingNeedSek > source.maxAmountSek) return false;
  }

  return true;
}

// Upserts a FundingMatch (idempotent via the unique index) and, only for a
// genuinely new match (no row existed before), notifies the project's
// leads -- surfaced in their notification feed, not a hidden search view.
async function recordMatch(source: FundingSource, project: MatchableProject) {
  const existing = await prisma.fundingMatch.findUnique({
    where: { fundingSourceId_projectId: { fundingSourceId: source.id, projectId: project.id } },
  });
  if (existing) return;

  await prisma.fundingMatch.create({
    data: { fundingSourceId: source.id, projectId: project.id, notifiedAt: new Date() },
  });

  const leads = await prisma.projectMember.findMany({
    where: { projectId: project.id, role: { in: ["FOUNDER", "ADMIN"] } },
    select: { userId: true },
  });
  for (const lead of leads) {
    await createNotification({
      userId: lead.userId,
      type: "funding_match",
      title: `Ny finansieringskälla matchar ${project.title}: ${source.name}`,
      url: `/projects/${project.slug}/funding-applications`,
    });
  }
}

const PROJECT_SELECT = {
  id: true,
  slug: true,
  title: true,
  sdgGoals: true,
  legalType: true,
  estimatedFundingNeedSek: true,
  hiddenAt: true,
} as const;

registerOutboxHandler("funding.sourceAdded", async (payload) => {
  const { fundingSourceId } = payload as { fundingSourceId: string };
  const source = await prisma.fundingSource.findUnique({ where: { id: fundingSourceId } });
  if (!source || source.status !== "ACTIVE") return;

  const projects = await prisma.project.findMany({ where: { hiddenAt: null }, select: PROJECT_SELECT });
  for (const project of projects) {
    if (isMatch(source, project)) {
      try {
        await recordMatch(source, project);
      } catch (err) {
        logger.error("fundingMatching: failed to record match", { fundingSourceId, projectId: project.id, err: String(err) });
      }
    }
  }
});

registerOutboxHandler("funding.projectUpdated", async (payload) => {
  const { projectId } = payload as { projectId: string };
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: PROJECT_SELECT });
  if (!project) return;

  const sources = await prisma.fundingSource.findMany({ where: { status: "ACTIVE" } });
  for (const source of sources) {
    if (isMatch(source, project)) {
      try {
        await recordMatch(source, project);
      } catch (err) {
        logger.error("fundingMatching: failed to record match", { fundingSourceId: source.id, projectId, err: String(err) });
      }
    }
  }
});

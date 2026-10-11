import { prisma } from "@/lib/prisma";
import { countPendingImpactReports } from "@/lib/impactReports";
import type { AdminQueue } from "@/lib/siteAdminNav";

// How many are waiting in each site-admin queue — the same "waiting" rule
// each queue's own page lists. A queue nobody can see the depth of is a
// queue nobody works.
export async function getAdminQueueCounts(): Promise<Record<AdminQueue, number>> {
  const [contentFlags, ethics, impactReports, suggestions, invoicing, legalType, profitDistribution, fundingCalls] = await Promise.all([
    prisma.contentFlag.count({ where: { status: "PENDING" } }),
    prisma.projectFlag.count({ where: { status: "pending" } }),
    countPendingImpactReports(),
    prisma.suggestion.count({ where: { status: "pending" } }),
    prisma.sandboxGraduationRequest.count({ where: { status: "pending" } }),
    prisma.legalTypeChangeRequest.count({ where: { status: "approved_by_members" } }),
    prisma.profitDistributionProposal.count({ where: { status: "approved_by_members" } }),
    // Utlysningar (#343): open drafts to check, and published calls the source changed.
    prisma.fundingCall.count({
      where: { OR: [{ status: "DRAFT", OR: [{ rolling: true }, { deadline: { gt: new Date() } }] }, { status: "PUBLISHED", changedAt: { not: null } }] },
    }),
  ]);
  return { contentFlags, ethics, impactReports, suggestions, invoicing, legalType, profitDistribution, fundingCalls };
}

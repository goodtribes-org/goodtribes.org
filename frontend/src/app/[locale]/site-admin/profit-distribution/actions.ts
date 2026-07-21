"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/authz";
import { isCommercialLegalType } from "@/lib/legalType";

async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireSiteAdmin(session.user.id);
  return session.user.id;
}

// PRD 4a Intäktsström 2, Steg 1: the board's ("styrelsen") proposed split of
// a commercial project's audited profit — creates the linked Tribe
// Token-weighted Poll members vote on, same direct-create pattern as
// legal-type/actions.ts's proposeLegalTypeChange.
export async function proposeProfitDistribution(formData: FormData) {
  const adminId = await requireAdmin();

  const projectSlug = (formData.get("projectSlug") as string | null)?.trim();
  const auditedProfitSek = parseInt((formData.get("auditedProfitSek") as string | null) ?? "", 10);
  const operationsPct = parseFloat((formData.get("operationsPct") as string | null) ?? "");
  const impactFundPct = parseFloat((formData.get("impactFundPct") as string | null) ?? "");

  if (
    !projectSlug ||
    !Number.isFinite(auditedProfitSek) ||
    auditedProfitSek < 0 ||
    !Number.isFinite(operationsPct) ||
    !Number.isFinite(impactFundPct) ||
    operationsPct < 0 ||
    impactFundPct < 0 ||
    operationsPct + impactFundPct > 100
  ) {
    return;
  }

  const project = await prisma.project.findUnique({ where: { slug: projectSlug } });
  if (!project || !isCommercialLegalType(project.legalType)) return;

  const remainingPct = 100 - operationsPct - impactFundPct;

  const poll = await prisma.poll.create({
    data: {
      projectSlug: project.slug,
      createdById: adminId,
      title: `Godkänn vinstfördelning: ${operationsPct}% drift, ${impactFundPct}% Impact-fond, ${remainingPct}% till bidragsgivare?`,
      type: "profit_distribution",
      options: {
        create: [
          { label: "Ja", sortOrder: 0 },
          { label: "Nej", sortOrder: 1 },
        ],
      },
    },
  });

  await prisma.profitDistributionProposal.create({
    data: {
      projectId: project.id,
      auditedProfitSek,
      proposedOperationsPct: operationsPct,
      proposedImpactFundPct: impactFundPct,
      pollId: poll.id,
      proposedById: adminId,
    },
  });

  revalidatePath("/site-admin/profit-distribution");
  revalidatePath(`/projects/${project.slug}/profit-distribution`);
}

// Stiftelsen's actual execution of a member-approved distribution: splits
// the audited profit into the three PRD 4a shares, carves out a fork
// compensation slice for any ForkProfitShare rows (PRD 4f) before creating
// one PersonalProfitAllocation per Tribe Token holder for the rest
// (proportional to their balance in the distributing project, floored to
// whole SEK — any leftover from flooring is folded into the Impact-fond's
// inflow, never lost), and logs the Impact-fond's share as a real ledger row.
export async function executeProfitDistribution(proposalId: string) {
  const adminId = await requireAdmin();

  const proposal = await prisma.profitDistributionProposal.findUnique({ where: { id: proposalId } });
  if (!proposal || proposal.status !== "approved_by_members") throw new Error("Proposal not ready to execute");

  const project = await prisma.project.findUnique({ where: { id: proposal.projectId }, select: { slug: true } });
  if (!project) throw new Error("Project not found");

  const operationsShareSek = Math.round((proposal.auditedProfitSek * proposal.proposedOperationsPct) / 100);
  const impactFundShareSek = Math.round((proposal.auditedProfitSek * proposal.proposedImpactFundPct) / 100);
  const remainingShareSek = proposal.auditedProfitSek - operationsShareSek - impactFundShareSek;

  // PRD 4f: if this project is a fork, a slice of its Steg-2 remainder goes
  // to the original project's contributors first, split among them by their
  // ForkProfitShare.sharePercent (proportional to their original stake).
  // FORK_RESERVED_PCT (the size of that slice) isn't specified in the PRD —
  // provisional, same spirit as other hardcoded placeholders this session
  // (Granskningsrådet's seat count, Sandlådan's GT pool sizes).
  const FORK_RESERVED_PCT = 10;
  const forkShares = await prisma.forkProfitShare.findMany({ where: { forkedProjectId: proposal.projectId } });
  const forkReservedSek = forkShares.length > 0 ? Math.floor((remainingShareSek * FORK_RESERVED_PCT) / 100) : 0;
  const forkAllocations = forkShares.map((f) => ({
    userId: f.originalContributorUserId,
    amountAvailableSek: Math.floor((forkReservedSek * f.sharePercent) / 100),
  }));
  const forkAllocatedSoFar = forkAllocations.reduce((sum, a) => sum + a.amountAvailableSek, 0);

  const holderRemainderSek = remainingShareSek - forkAllocatedSoFar;

  const holderTotals = await prisma.tokenLedger.groupBy({
    by: ["userId"],
    where: { projectSlug: project.slug },
    _sum: { tokens: true },
  });
  const holders = holderTotals
    .map((h) => ({ userId: h.userId, balance: h._sum.tokens ?? 0 }))
    .filter((h) => h.balance > 0);
  const totalTokens = holders.reduce((sum, h) => sum + h.balance, 0);

  const allocationDeadline = new Date();
  allocationDeadline.setDate(allocationDeadline.getDate() + 30); // PRD's own example figure (4a Steg 2)

  let allocatedSoFar = 0;
  const holderAllocations = holders.map((h) => {
    const amountAvailableSek =
      totalTokens > 0 ? Math.floor((h.balance / totalTokens) * holderRemainderSek) : 0;
    allocatedSoFar += amountAvailableSek;
    return { userId: h.userId, amountAvailableSek, allocationDeadline };
  });
  const roundingRemainder = remainingShareSek - forkAllocatedSoFar - allocatedSoFar;
  const allocations = [...forkAllocations.map((a) => ({ ...a, allocationDeadline })), ...holderAllocations];

  await prisma.$transaction(async (tx) => {
    const distribution = await tx.profitDistribution.create({
      data: {
        proposalId,
        projectId: proposal.projectId,
        auditedProfitSek: proposal.auditedProfitSek,
        operationsShareSek,
        impactFundShareSek,
        remainingShareSek,
      },
    });

    if (allocations.length > 0) {
      await tx.personalProfitAllocation.createMany({
        data: allocations.map((a) => ({ ...a, distributionId: distribution.id })),
      });
    }

    await tx.impactFundLedger.create({
      data: {
        direction: "in",
        amountSek: impactFundShareSek + roundingRemainder,
        relatedDistributionId: distribution.id,
        recordedById: adminId,
        note:
          "Styrelsens andel av vinstfördelning" +
          (roundingRemainder > 0 ? ` (inkl. ${roundingRemainder} kr avrundningsrest)` : ""),
      },
    });

    await tx.profitDistributionProposal.update({
      where: { id: proposalId },
      data: { status: "executed", executedById: adminId, executedAt: new Date() },
    });
  });

  revalidatePath("/site-admin/profit-distribution");
  revalidatePath(`/projects/${project.slug}/profit-distribution`);
  revalidatePath("/impact-fond");
}

// PRD 4a: "styrelsen har vetorätt om utfallet skulle utgöra en fara för
// Stiftelsens fortsatta verksamhet" — mirrors rejectLegalTypeChange.
export async function vetoProfitDistribution(proposalId: string, note: string) {
  const adminId = await requireAdmin();

  const proposal = await prisma.profitDistributionProposal.findUnique({ where: { id: proposalId } });
  if (!proposal || proposal.status !== "approved_by_members") throw new Error("Proposal not ready to veto");

  await prisma.profitDistributionProposal.update({
    where: { id: proposalId },
    data: {
      status: "vetoed_by_foundation",
      decisionNote: note || null,
      executedById: adminId,
      executedAt: new Date(),
    },
  });

  revalidatePath("/site-admin/profit-distribution");
}

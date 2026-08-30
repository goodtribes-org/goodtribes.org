import { prisma } from "@/lib/prisma";

export interface PlatformImpactStats {
  totalRaisedSek: number;
  totalDonatedSek: number;
  tasksCompleted: number;
}

// Platform-wide totals for the homepage snapshot widget, distinct from
// networkStats.ts's getNetworkStats (scoped to one project + its franchise
// instances). "Raised" (FundingPledge) and "donated" (ImpactFundLedger
// direction "out") are deliberately kept separate -- one is money pledged
// into a campaign, the other is money the impact fund has actually paid
// out -- same distinction getImpactFundBalance() already relies on.
export async function getPlatformImpactStats(): Promise<PlatformImpactStats> {
  const [pledges, donated, tasksCompleted] = await Promise.all([
    prisma.fundingPledge.aggregate({ _sum: { amount: true } }),
    prisma.impactFundLedger.aggregate({
      where: { direction: "out" },
      _sum: { amountSek: true },
    }),
    prisma.kanbanCardSubtask.count({ where: { done: true } }),
  ]);

  return {
    totalRaisedSek: pledges._sum.amount ?? 0,
    totalDonatedSek: donated._sum.amountSek ?? 0,
    tasksCompleted,
  };
}

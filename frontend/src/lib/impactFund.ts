import { prisma } from "@/lib/prisma";

// The Impact-fond's current spendable balance in SEK (PRD 5.50/5.52) —
// always real currency, never a token amount. Every inflow/outflow is a
// real, admin-attested ImpactFundLedger row, so the balance is just the
// running sum of that ledger.
export async function getImpactFundBalance(): Promise<number> {
  const [inflow, outflow] = await Promise.all([
    prisma.impactFundLedger.aggregate({
      where: { direction: "in" },
      _sum: { amountSek: true },
    }),
    prisma.impactFundLedger.aggregate({
      where: { direction: "out" },
      _sum: { amountSek: true },
    }),
  ]);
  return (inflow._sum.amountSek ?? 0) - (outflow._sum.amountSek ?? 0);
}

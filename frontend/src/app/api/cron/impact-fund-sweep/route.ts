import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// Called daily by an external scheduler (GitHub Actions cron, see
// .github/workflows/impact-fund-sweep.yml). Requires the same
// Authorization: Bearer <CRON_SECRET> header as /api/cron/digest.
//
// A missing CRON_SECRET fails closed rather than skipping the auth check —
// see /api/cron/github-sync for the reference pattern. This route moves real
// ledger balances, which makes fail-open especially costly here.
//
// PRD 4a Intäktsström 2, Steg 2: if a bidragsgivare doesn't actively choose a
// target project before their PersonalProfitAllocation's deadline, their
// share defaults to the Impact-fonden — this sweep is what actually applies
// that default and logs it as a real ledger row.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expired = await prisma.personalProfitAllocation.findMany({
    where: { processedAt: null, allocationDeadline: { lt: new Date() } },
  });

  // Isolated per row: one bad allocation shouldn't abort the whole sweep and
  // silently leave every allocation after it unprocessed until the next run.
  let defaulted = 0;
  const failed: string[] = [];
  for (const allocation of expired) {
    try {
      await prisma.$transaction([
        prisma.personalProfitAllocation.update({
          where: { id: allocation.id },
          data: { processedAt: new Date() },
        }),
        prisma.impactFundLedger.create({
          data: {
            direction: "in",
            amountSek: allocation.amountAvailableSek,
            relatedAllocationId: allocation.id,
            note: "Automatiskt default — inget val gjordes inom tidsramen (PRD 4a, Steg 2)",
          },
        }),
      ]);
      defaulted++;
    } catch (err) {
      failed.push(allocation.id);
      logger.error("impact-fund-sweep: failed to process allocation", {
        allocationId: allocation.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ ok: true, defaulted, failed });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Called daily by an external scheduler (GitHub Actions cron, see
// .github/workflows/impact-fund-sweep.yml). Requires the same
// Authorization: Bearer <CRON_SECRET> header as /api/cron/digest.
//
// PRD 4a Intäktsström 2, Steg 2: if a bidragsgivare doesn't actively choose a
// target project before their PersonalProfitAllocation's deadline, their
// share defaults to the Impact-fonden — this sweep is what actually applies
// that default and logs it as a real ledger row.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const expired = await prisma.personalProfitAllocation.findMany({
    where: { processedAt: null, allocationDeadline: { lt: new Date() } },
  });

  let defaulted = 0;
  for (const allocation of expired) {
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
  }

  return NextResponse.json({ ok: true, defaulted });
}

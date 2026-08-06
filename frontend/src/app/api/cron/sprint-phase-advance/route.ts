import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { closeAndAdvancePhase } from "@/lib/sprints";

// Called periodically by an external scheduler (GitHub Actions cron, see
// .github/workflows/sprint-phase-advance.yml). Requires the same
// Authorization: Bearer <CRON_SECRET> header as /api/cron/sandbox-seed.
//
// Only ever matches SPREAD_OUT sprints — TOGETHER-paced phases never get a
// deadlineAt, so they only advance via the lead-triggered advancePhase
// Server Action instead.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const expired = await prisma.sprintPhase.findMany({
    where: { status: "OPEN", deadlineAt: { lte: new Date() } },
    select: { id: true },
  });

  for (const phase of expired) {
    await closeAndAdvancePhase(phase.id);
  }

  return NextResponse.json({ ok: true, advanced: expired.length });
}

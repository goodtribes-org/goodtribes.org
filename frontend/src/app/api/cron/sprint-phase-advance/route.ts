import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { closeAndAdvancePhase } from "@/lib/sprints";

// Called periodically by an external scheduler (GitHub Actions cron, see
// .github/workflows/sprint-phase-advance.yml). Requires the same
// Authorization: Bearer <CRON_SECRET> header as /api/cron/sandbox-seed.
//
// A missing CRON_SECRET fails closed rather than skipping the auth check —
// see /api/cron/github-sync for the reference pattern.
//
// Only ever matches SPREAD_OUT sprints — TOGETHER-paced phases never get a
// deadlineAt, so they only advance via the lead-triggered advancePhase
// Server Action instead.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

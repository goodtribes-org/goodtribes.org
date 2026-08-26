import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { closeAndAdvancePhase } from "@/lib/sprints";
import { logger } from "@/lib/logger";

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

  // Isolated per phase: one bad row shouldn't abort the whole sweep and
  // leave every phase after it stuck open until the next run.
  let advanced = 0;
  const failed: string[] = [];
  for (const phase of expired) {
    try {
      await closeAndAdvancePhase(phase.id);
      advanced++;
    } catch (err) {
      failed.push(phase.id);
      logger.error("sprint-phase-advance: failed to advance phase", {
        phaseId: phase.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ ok: true, advanced, failed });
}

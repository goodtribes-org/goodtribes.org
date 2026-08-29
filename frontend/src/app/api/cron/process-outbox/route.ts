import { NextResponse } from "next/server";
import { processPendingOutboxEvents } from "@/lib/outbox";
// Side-effect import: registers every outbox handler this app knows about
// (see outboxHandlers.ts) before the sweep below runs. Without this, a
// pending event whose handler happens not to be registered in *this*
// process would be logged as "no handler registered" and left pending,
// even though the type is perfectly real.
import "@/lib/outboxHandlers";

export const dynamic = "force-dynamic";

// Meant to be called every minute or so by an external scheduler (see
// CLAUDE.md's cron-workflow conventions — the same GitHub Actions/
// Kubernetes CronJob pattern as every other /api/cron/* route). Sweeps
// pending OutboxEvent rows (src/lib/outbox.ts) that either skipped
// immediate processing (enqueued from inside a transaction) or had a
// transient failure on their first attempt.
//
// A missing CRON_SECRET fails closed rather than skipping the auth check —
// see /api/cron/github-sync for the reference pattern.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { processed, failed } = await processPendingOutboxEvents();

  return NextResponse.json({ ok: true, processed, failed });
}

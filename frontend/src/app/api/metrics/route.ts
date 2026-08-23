import { NextResponse } from "next/server"
import { metricsRegistry } from "@/lib/metrics"

// Same CRON_SECRET bearer convention as /api/cron/* — a future Prometheus
// scrape config sets `bearer_token`/`bearer_token_file` to this value.
// Gated rather than public: process/GC/event-loop metrics are low-sensitivity
// but still infra fingerprinting info, and this repo's default for any
// diagnostic endpoint (see the /api/meili-sync finding in CLAUDE.md) is
// closed unless there's a reason to open it. Fails closed if CRON_SECRET is
// unset, matching every other route using this convention.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 })
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await metricsRegistry.metrics()
  return new NextResponse(body, { headers: { "Content-Type": metricsRegistry.contentType } })
}

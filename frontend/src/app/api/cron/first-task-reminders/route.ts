import { NextResponse } from "next/server";
import { runFirstTaskReminders } from "@/lib/firstTaskReminders";

export const dynamic = "force-dynamic";

// Once a day: remind leads about first-task sign-ups waiting a week, and
// close those waiting two (src/lib/firstTaskReminders.ts). Same CRON_SECRET
// bearer convention as every /api/cron/* route; a missing secret fails closed.
// No scheduler is wired up yet — that waits on CRON_SECRET (ops#4).
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runFirstTaskReminders();
  return NextResponse.json({ ok: true, ...result });
}

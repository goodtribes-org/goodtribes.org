import { NextResponse } from "next/server";
import { importFundingCalls } from "@/lib/fundingCalls/import";
import { remindFundingCallDeadlines } from "@/lib/fundingCalls/reminders";

// Utlysningar (#343): called daily by a scheduler (ops: an in-cluster
// CronJob like github-sync), same Authorization: Bearer <CRON_SECRET>
// convention as every other /api/cron/* route — fails closed (503) when the
// secret isn't configured. Imports drafts only; publishing is an admin's.
// Also sends the application projects' deadline reminders.

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await importFundingCalls();
  // The application projects' deadline reminders (#345), same daily run.
  const reminders = await remindFundingCallDeadlines();
  return NextResponse.json({ ...result, reminders });
}

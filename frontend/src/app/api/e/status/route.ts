import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveEvent, getEventProgress } from "@/lib/events";

// For EventBar (#281): which evening the visitor is at and how many of its
// three steps they've done. { event: null } when they aren't at one.
export async function GET() {
  const event = await getActiveEvent();
  if (!event) return NextResponse.json({ event: null });
  const session = await auth();
  const p = session?.user?.id ? await getEventProgress(event.id, session.user.id) : null;
  const done = p ? [p.dreams.length > 0, p.openedTask, p.helped].filter(Boolean).length : 0;
  return NextResponse.json({ event: { code: event.code, title: event.title }, done });
}

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { FlagReason } from "@prisma/client";
import { isContentTargetType, targetExists, autoHoldIfThresholdReached } from "@/lib/contentModeration";

const FLAG_REASONS: FlagReason[] = ["SPAM", "HARASSMENT", "OFFENSIVE", "OFF_TOPIC", "OTHER"];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: { targetType?: string; targetId?: string; reason?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { targetType, targetId, reason, note } = body;

  if (!targetType || !isContentTargetType(targetType)) {
    return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
  }

  if (!targetId || typeof targetId !== "string") {
    return NextResponse.json({ error: "targetId is required" }, { status: 400 });
  }

  if (!reason || !FLAG_REASONS.includes(reason as FlagReason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }

  if (!(await targetExists(targetType, targetId))) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  try {
    await prisma.contentFlag.create({
      data: {
        targetType,
        targetId,
        flaggedById: userId,
        reason: reason as FlagReason,
        note: note?.trim() || null,
      },
    });
  } catch {
    // Unique constraint — this user already flagged this content.
    return NextResponse.json({ error: "You already flagged this" }, { status: 409 });
  }

  await autoHoldIfThresholdReached(targetType, targetId);

  return NextResponse.json({ success: true });
}

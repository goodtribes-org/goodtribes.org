import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { hideTarget, type ContentTargetType } from "@/lib/contentModeration";
import { detectSpamSignal } from "@/lib/spamDetection";

// Called right after a content row is created (same position as the
// existing flag-threshold auto-hold path in api/content-flags/route.ts).
// Best-effort — a failure here must never block the caller's main flow.
export async function runProactiveModeration(params: {
  targetType: ContentTargetType;
  targetId: string;
  authorId: string;
  text: string;
  url?: string;
}): Promise<void> {
  try {
    const signal = detectSpamSignal(params.text);
    if (!signal) return;

    await prisma.contentFlag.create({
      data: {
        targetType: params.targetType,
        targetId: params.targetId,
        flaggedById: null,
        source: "AUTO",
        reason: "SPAM",
        note: signal,
      },
    });

    await hideTarget(params.targetType, params.targetId, {
      hiddenById: null,
      hiddenReason: "AUTO_SPAM_DETECTED",
    });

    await createNotification({
      userId: params.authorId,
      type: "content_auto_held",
      title: "Ditt inlägg hölls tillbaka för granskning",
      body: signal,
      url: params.url,
    });
  } catch {
    // never block content creation on a moderation-check failure
  }
}

"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { guardSocialAction } from "@/lib/socialActionGuard";
import { detectSpamSignal } from "@/lib/spamDetection";

const MAX_LENGTH = 2000;

export async function createSuggestion(body: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const trimmed = body.trim();
  if (!trimmed) return { error: "Förslaget är tomt" };
  if (trimmed.length > MAX_LENGTH) return { error: `Förslaget är för långt (max ${MAX_LENGTH} tecken)` };

  const guard = await guardSocialAction(session.user.id, "suggestion");
  if (!guard.ok) return { error: guard.error, code: guard.code };

  // A suggestion is never shown to other users, only its author and admins —
  // there's no public view to hide it from, so a spam hit just lands the
  // row pre-dismissed instead of going through the full ContentFlag/
  // hideTarget pipeline built for publicly-visible content.
  const signal = detectSpamSignal(trimmed);

  await prisma.suggestion.create({
    data: {
      authorId: session.user.id,
      body: trimmed,
      ...(signal ? { status: "dismissed", decisionNote: signal, reviewedAt: new Date() } : {}),
    },
  });

  revalidatePath("/suggestions");
  revalidatePath("/site-admin/suggestions");
  return { ok: true };
}

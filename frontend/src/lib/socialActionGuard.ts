import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

const LIMITS = { like: 30, comment: 10, flag: 5, post: 5, message: 30 } as const;

export type SocialAction = keyof typeof LIMITS;

export type SocialActionGuardResult = { ok: true } | { ok: false; error: string; code: "SUSPENDED" | "RATE_LIMITED" };

// Re-fetches suspendedAt rather than trusting the session — lib/authz.ts
// documents session.user.siteRole as possibly-stale for the same reason;
// a suspension should take effect immediately, not on next login.
export async function guardSocialAction(userId: string, action: SocialAction): Promise<SocialActionGuardResult> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { suspendedAt: true } });
  if (user?.suspendedAt) {
    return { ok: false, error: "Ditt konto är avstängt.", code: "SUSPENDED" };
  }

  const allowed = await checkRateLimit(`rl:${action}:${userId}`, LIMITS[action], 60);
  if (!allowed) {
    return { ok: false, error: "Du gör det där lite för snabbt — försök igen om en liten stund.", code: "RATE_LIMITED" };
  }

  return { ok: true };
}

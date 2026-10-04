import type { SiteRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ROLE_LABEL: Record<SiteRole, string> = { USER: "Användare", ADMIN: "Admin", OWNER: "Ägare" };

// Auth.js keeps a database session for 30 days and moves its expiry forward
// when it's used (at most once a day), so the newest session's expiry minus
// 30 days is when the person was last active, give or take a day.
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export function lastActiveAt(newestSessionExpiry: Date | undefined): Date | null {
  return newestSessionExpiry ? new Date(newestSessionExpiry.getTime() - SESSION_MAX_AGE_MS) : null;
}

// Accounts that may be the same person: the same name (ignoring case and
// spaces) on more than one account. Only flagged for an admin to look at —
// nothing is merged automatically.
export async function possibleDuplicateIds(): Promise<Set<string>> {
  const users = await prisma.user.findMany({ where: { name: { not: null } }, select: { id: true, name: true } });
  const byName = new Map<string, string[]>();
  for (const u of users) {
    const key = nameKey(u.name);
    if (!key) continue;
    byName.set(key, [...(byName.get(key) ?? []), u.id]);
  }
  return new Set([...byName.values()].filter((ids) => ids.length > 1).flat());
}

export function nameKey(name: string | null): string {
  return (name ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

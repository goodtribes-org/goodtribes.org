"use server";

import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSiteAdmin, isSiteOwner } from "@/lib/authz";
import type { SiteRole } from "@prisma/client";

// Sends the same magic-link email as a normal /login signup — no User row
// is created here; the Resend provider's own adapter flow creates the
// account lazily when the invitee actually clicks the link (see auth.ts's
// createUser event for the welcome email that follows that).
export async function inviteUser(email: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireSiteAdmin(session.user.id);

  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, error: "Ogiltig e-postadress" };
  }

  const existing = await prisma.user.findUnique({ where: { email: trimmed } });
  if (existing) return { ok: false, error: "En användare med den e-postadressen finns redan" };

  const result = await signIn("resend", { email: trimmed, redirect: false });
  if (result?.error) return { ok: false, error: "Kunde inte skicka inbjudan" };

  revalidatePath("/site-admin/users");
  return { ok: true };
}

export async function setSiteRole(userId: string, role: SiteRole) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  // Only a site OWNER can appoint/demote other site admins — plain ADMINs
  // managing roles could otherwise escalate themselves or peers.
  if (!(await isSiteOwner(session.user.id))) throw new Error("Forbidden");

  await prisma.user.update({ where: { id: userId }, data: { siteRole: role } });
  revalidatePath("/site-admin/users");
}

export async function setSuspended(userId: string, suspended: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireSiteAdmin(session.user.id);

  await prisma.user.update({
    where: { id: userId },
    data: { suspendedAt: suspended ? new Date() : null },
  });
  revalidatePath("/site-admin/users");
}

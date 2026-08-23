"use server";

import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSiteAdmin, isSiteOwner } from "@/lib/authz";
import { indexDocuments } from "@/lib/meili";
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

// Unlike inviteUser, this creates the User row directly with the full
// profile already filled in — for when a site admin wants to add someone
// on the spot instead of waiting for them to click a magic-link email
// (e.g. onboarding someone in person). The account still has no password/
// magic-link session yet; the person logs in normally later via their
// email, which the adapter matches to this existing row.
export async function createUser(formData: FormData): Promise<{ ok: boolean; error?: string; name?: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireSiteAdmin(session.user.id);

  const name = (formData.get("name") as string | null)?.trim();
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  if (!name) return { ok: false, error: "Namn krävs" };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Ogiltig e-postadress" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "En användare med den e-postadressen finns redan" };

  const bio = (formData.get("bio") as string | null)?.trim() || null;
  const country = (formData.get("country") as string | null)?.trim() || null;
  const image = (formData.get("image") as string | null)?.trim() || null;
  const showProfile = formData.get("showProfile") === "on";
  const skillIds = formData.getAll("skillIds") as string[];

  const interestsRaw = formData.get("interests") as string | null;
  const interests: number[] = interestsRaw ? (JSON.parse(interestsRaw) as number[]) : [];

  const availabilityRaw = (formData.get("availability") as string | null)?.trim() || null;
  const availability = availabilityRaw && ["available", "limited", "busy"].includes(availabilityRaw)
    ? availabilityRaw
    : null;

  const socialLinks: Record<string, string> = {};
  for (const key of ["website", "linkedin", "github", "twitter"] as const) {
    const val = (formData.get(key) as string | null)?.trim();
    if (val) socialLinks[key] = val;
  }

  const created = await prisma.user.create({
    data: {
      name,
      email,
      bio,
      country,
      image,
      showProfile,
      interests,
      availability,
      socialLinks,
      onboardingDone: true,
      skills: { create: skillIds.map((skillId) => ({ skillId })) },
    },
  });

  if (showProfile) {
    void indexDocuments("members", [
      {
        id: `member-${created.id}`,
        type: "member",
        title: name,
        description: bio ?? "",
        url: `/members/${created.id}`,
      },
    ]);
  }

  revalidatePath("/site-admin/users");
  revalidatePath("/members");
  return { ok: true, name };
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

"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { createNotification } from "@/lib/notify";
import { PROJECT_LEAD_ROLES } from "@/lib/authz";
import { canConfirm, hashConfirmationToken, isWellFormedToken } from "@/lib/impactConfirmation";

// Partnerbekräftelse (#336), the recipient's side: no account, one click.
// Limited per address like /api/search, with a honeypot field bots fill
// in. The link works once; the team's leads are told when it's used.
export async function confirmImpact(
  token: string,
  input: { name: string; org: string; comment: string; showOrg: boolean; website: string },
): Promise<{ error?: string }> {
  if (input.website) return {}; // honeypot: look fine, save nothing
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await checkRateLimit(`impact-confirm:${ip}`, 10, 3600))) return { error: "För många försök — prova igen om en stund" };
  if (!isWellFormedToken(token)) return { error: "Länken fungerar inte" };
  const name = input.name.trim().slice(0, 80);
  const org = input.org.trim().slice(0, 120);
  if (!name || !org) return { error: "Skriv ditt namn och din organisation" };
  const row = await prisma.impactConfirmation.findUnique({
    where: { tokenHash: hashConfirmationToken(token) },
    select: { id: true, confirmedAt: true, revokedAt: true, expiresAt: true, project: { select: { id: true, slug: true, title: true, hiddenAt: true } } },
  });
  if (!row || row.project.hiddenAt || !canConfirm(row, Date.now())) return { error: "Länken fungerar inte längre" };
  // Only a still-open link is used: two clicks at once confirm once.
  const used = await prisma.impactConfirmation.updateMany({
    where: { id: row.id, confirmedAt: null, revokedAt: null },
    data: { confirmedAt: new Date(), confirmerName: name, confirmerOrg: org, comment: input.comment.trim().slice(0, 1000) || null, showOrgPublicly: input.showOrg },
  });
  if (!used.count) return { error: "Länken fungerar inte längre" };
  const leads = await prisma.projectMember.findMany({ where: { projectId: row.project.id, role: { in: [...PROJECT_LEAD_ROLES] } }, select: { userId: true } });
  for (const l of leads) {
    await createNotification({
      userId: l.userId,
      type: "impact_confirmed",
      title: `${org} har bekräftat berättelsen om ${row.project.title}`,
      body: `${name} har sett er berättelse och bekräftat att den stämmer.`,
      url: `/projects/${row.project.slug}/impactfasen?step=impact_externally_verified`,
    });
  }
  revalidatePath(`/projects/${row.project.slug}`);
  revalidatePath(`/projects/${row.project.slug}/impactfasen`);
  return {};
}

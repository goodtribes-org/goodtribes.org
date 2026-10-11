"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { confirmationExpiry, newConfirmationToken } from "@/lib/impactConfirmation";

// Partnerbekräftelse (#336), the team's side: make a link for one
// recipient, or take one back. Leads only — the link speaks for the project
// outward.

async function requireLead(slug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
  if (!project || !(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return null;
  return { projectId: project.id, userId: session.user.id };
}

// The link is returned once and never stored — only its hash is.
export async function createConfirmationLink(slug: string, label: string): Promise<{ error?: string; path?: string }> {
  const ctx = await requireLead(slug);
  if (!ctx) return { error: "Forbidden" };
  const who = label.trim().slice(0, 120);
  if (!who) return { error: "Skriv vem ni skickar länken till" };
  const followup = await prisma.impactFollowup.findUnique({ where: { projectSlug: slug }, select: { story: true } });
  if (!followup?.story?.trim()) return { error: "Skriv er berättelse först — det är den partnern bekräftar" };
  const { token, tokenHash } = newConfirmationToken();
  await prisma.impactConfirmation.create({
    data: { projectId: ctx.projectId, tokenHash, label: who, createdById: ctx.userId, expiresAt: confirmationExpiry(Date.now()) },
  });
  revalidatePath(`/projects/${slug}/impactfasen`);
  return { path: `/bekrafta/${token}` };
}

export async function revokeConfirmationLink(slug: string, id: string): Promise<{ error?: string }> {
  const ctx = await requireLead(slug);
  if (!ctx) return { error: "Forbidden" };
  await prisma.impactConfirmation.updateMany({ where: { id, projectId: ctx.projectId, confirmedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
  revalidatePath(`/projects/${slug}/impactfasen`);
  return {};
}

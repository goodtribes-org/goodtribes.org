"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { startUppstartFill, UPPSTART_SECTIONS, type UppstartSection } from "@/lib/uppstartFill";

async function requireLead(projectSlug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true, slug: true } });
  if (!project || !(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return null;
  return { project, userId: session.user.id };
}

function done(projectSlug: string) {
  revalidatePath(`/projects/${projectSlug}/uppstart`);
  return {};
}

// "Låt AI:n ta fram utkast" (all sections) and "Försök igen" (one).
export async function startUppstartDrafts(projectSlug: string, section?: string): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if (section && !UPPSTART_SECTIONS.includes(section as UppstartSection)) return { error: "Okänd sektion" };
  if (!(await isAiProjectStartAvailable(ctx.userId))) return { error: "AI är inte tillgänglig just nu." };
  await startUppstartFill({
    projectId: ctx.project.id,
    projectSlug: ctx.project.slug,
    userId: ctx.userId,
    only: section ? [section as UppstartSection] : undefined,
  });
  return done(projectSlug);
}

// ─── Kärnteamets roller ─────────────────────────────────────────────────────

function cleanRole(title: string, description: string) {
  return { title: title.trim().slice(0, 200), description: description.trim().slice(0, 2000) || null };
}

export async function addRoleNeed(projectSlug: string, title: string, description: string): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  const data = cleanRole(title, description);
  if (!data.title) return { error: "Rollen behöver en titel" };
  const max = await prisma.projectRoleNeed.aggregate({ where: { projectId: ctx.project.id }, _max: { order: true } });
  await prisma.projectRoleNeed.create({ data: { projectId: ctx.project.id, ...data, order: (max._max.order ?? -1) + 1 } });
  return done(projectSlug);
}

export async function updateRoleNeed(projectSlug: string, roleId: string, title: string, description: string): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  const data = cleanRole(title, description);
  if (!data.title) return { error: "Rollen behöver en titel" };
  await prisma.projectRoleNeed.updateMany({ where: { id: roleId, projectId: ctx.project.id }, data });
  return done(projectSlug);
}

export async function deleteRoleNeed(projectSlug: string, roleId: string): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  await prisma.projectRoleNeed.deleteMany({ where: { id: roleId, projectId: ctx.project.id } });
  return done(projectSlug);
}

// Points a role at a project member (or clears it). Only real members —
// not followers — can fill a role. When every role is filled, the
// checklist step "Definiera roller och bilda kärnteam" is done.
export async function assignRoleNeed(projectSlug: string, roleId: string, userId: string | null): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if (userId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: ctx.project.id, userId } },
      select: { role: true },
    });
    if (!member || member.role === "FOLLOWER") return { error: "Personen är inte medlem i projektet" };
  }
  await prisma.projectRoleNeed.updateMany({ where: { id: roleId, projectId: ctx.project.id }, data: { filledById: userId } });

  const roles = await prisma.projectRoleNeed.findMany({ where: { projectId: ctx.project.id }, select: { filledById: true } });
  // Never un-ticks: someone may have marked the step done by hand.
  if (roles.length > 0 && roles.every((r) => r.filledById)) {
    await prisma.initiativeChecklistItem.upsert({
      where: { projectId_itemKey: { projectId: ctx.project.id, itemKey: "core_team_formed" } },
      create: { projectId: ctx.project.id, phase: "PILOT", itemKey: "core_team_formed", completedAt: new Date(), completedById: ctx.userId },
      update: { completedAt: new Date(), completedById: ctx.userId },
    });
  }
  return done(projectSlug);
}

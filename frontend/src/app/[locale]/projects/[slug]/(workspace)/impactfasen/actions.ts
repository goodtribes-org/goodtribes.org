"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { gateBriefErrorMessage } from "@/lib/gateDecision";
import { IMPACT_SECTIONS, NEXT_STEP_DECISION, runNextStepBrief, startImpactFill, type ImpactSection, type NextStepOption } from "@/lib/impactPhaseFill";

async function requireLead(projectSlug: string, founderOnly = false) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true, slug: true, phase: true } });
  if (!project || !(await hasProjectRole(project.id, session.user.id, founderOnly ? ["FOUNDER"] : PROJECT_LEAD_ROLES))) return null;
  return { project, userId: session.user.id };
}

const done = (projectSlug: string) => {
  revalidatePath(`/projects/${projectSlug}/impactfasen`);
  return {};
};

// "Låt AI:n ta fram utkast" (all sections) and "Försök igen" (one).
export async function startImpactDrafts(projectSlug: string, section?: string): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if (section && !IMPACT_SECTIONS.includes(section as ImpactSection)) return { error: "Okänd sektion" };
  if (!(await isAiProjectStartAvailable(ctx.userId))) return { error: "AI är inte tillgänglig just nu." };
  await startImpactFill({ projectId: ctx.project.id, projectSlug: ctx.project.slug, userId: ctx.userId, only: section ? [section as ImpactSection] : undefined });
  return done(projectSlug);
}

export async function generateNextStepBrief(projectSlug: string): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if (!(await isAiProjectStartAvailable(ctx.userId))) return { error: "AI är inte tillgänglig just nu." };
  try {
    await runNextStepBrief(ctx.project.id, ctx.project.slug, ctx.userId);
  } catch (err) {
    return { error: gateBriefErrorMessage(err, "impact next-step") };
  }
  return done(projectSlug);
}

// The last decision of the journey. Closing responsibly is the founder's
// call (same rule as pausing at the gates); continuing or replicating is
// any lead's. Recorded on the impact follow-up and ticks the step.
export async function decideNextStep(projectSlug: string, option: string): Promise<{ error?: string }> {
  if (!(option in NEXT_STEP_DECISION)) return { error: "Okänt beslut" };
  const ctx = await requireLead(projectSlug, option === "close");
  if (!ctx) return { error: option === "close" ? "Bara grundaren kan avsluta projektet" : "Forbidden" };
  if (ctx.project.phase !== "IMPACT") return { error: "Projektet är inte i Impact" };
  const nextStepDecision = NEXT_STEP_DECISION[option as NextStepOption];
  await prisma.$transaction([
    prisma.impactFollowup.upsert({
      where: { projectSlug: ctx.project.slug },
      create: { projectSlug: ctx.project.slug, nextStepDecision, updatedById: ctx.userId },
      update: { nextStepDecision, updatedById: ctx.userId },
    }),
    prisma.initiativeChecklistItem.upsert({
      where: { projectId_itemKey: { projectId: ctx.project.id, itemKey: "next_step_decided" } },
      create: { projectId: ctx.project.id, phase: "IMPACT", itemKey: "next_step_decided", completedAt: new Date(), completedById: ctx.userId },
      update: { completedAt: new Date(), completedById: ctx.userId },
    }),
  ]);
  return done(projectSlug);
}

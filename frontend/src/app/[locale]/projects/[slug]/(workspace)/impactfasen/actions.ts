"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { gateBriefErrorMessage } from "@/lib/gateDecision";
import { IMPACT_SECTIONS, NEXT_STEP_DECISION, runNextStepBrief, startImpactFill, type ImpactSection, type NextStepOption } from "@/lib/impactPhaseFill";
import { draftImpact, IMPACT_DRAFT_KINDS, type ImpactDraftKind } from "@/lib/impactDrafts";
import { aiGateMessage } from "@/lib/aiMode";
import { createNotification } from "@/lib/notify";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { logger } from "@/lib/logger";

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

// ─── Impacts steg (#334) ────────────────────────────────────────────────────

const FOLLOWUP_TEXT = ["story", "voiceQuote", "voiceWho", "externalVerificationNotes", "celebrationNotes"] as const;

// The steps' texts (only the fields sent are changed); voiceConsent as "1"/"".
export async function saveImpactFollowup(projectSlug: string, patch: Record<string, string>): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  const data: Record<string, string | boolean | null> = {};
  for (const f of FOLLOWUP_TEXT) if (typeof patch[f] === "string") data[f] = patch[f].trim().slice(0, 8000) || null;
  if (typeof patch.voiceConsent === "string") data.voiceConsent = patch.voiceConsent === "1";
  await prisma.impactFollowup.upsert({ where: { projectSlug }, create: { projectSlug, ...data, updatedById: ctx.userId }, update: { ...data, updatedById: ctx.userId } });
  return done(projectSlug);
}

export async function suggestImpact(projectSlug: string, kind: string): Promise<{ text?: string; error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if (!IMPACT_DRAFT_KINDS.includes(kind as ImpactDraftKind)) return { error: "Okänt förslag" };
  try {
    const res = await draftImpact(ctx.project.id, ctx.project.slug, ctx.userId, kind as ImpactDraftKind);
    if (res.ok) return { text: res.text };
    if (res.reason === "empty") return { error: "AI:n kom inte fram till något förslag — försök igen." };
    return { error: aiGateMessage(res.reason) };
  } catch (err) {
    logger.error("impact draft failed", { kind, err: String(err) });
    return { error: "Kunde inte göra det just nu — försök igen." };
  }
}

// "Det här gjorde ni möjligt": the story to everyone who contributed —
// members (not followers), people who finished a task, people who gave
// money — once.
export async function shareStoryWithContributors(projectSlug: string): Promise<{ error?: string; sent?: number }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  const followup = await prisma.impactFollowup.findUnique({ where: { projectSlug }, select: { story: true, storySharedAt: true } });
  if (!followup?.story?.trim()) return { error: "Skriv berättelsen först." };
  if (followup.storySharedAt) return { error: "Berättelsen är redan skickad." };
  const [project, members, helpers, givers] = await Promise.all([
    prisma.project.findUnique({ where: { id: ctx.project.id }, select: { title: true } }),
    prisma.projectMember.findMany({ where: { projectId: ctx.project.id, role: { not: "FOLLOWER" } }, select: { userId: true } }),
    prisma.kanbanCard.findMany({ where: { projectSlug, column: "DONE", assigneeId: { not: null } }, select: { assigneeId: true }, distinct: ["assigneeId"] }),
    prisma.fundingPledge.findMany({ where: { campaign: { projectId: ctx.project.id }, pledgeStatus: "confirmed" }, select: { userId: true }, distinct: ["userId"] }),
  ]);
  const ai = await getAiParticipantUser();
  const recipients = new Set([...members.map((m) => m.userId), ...helpers.map((h) => h.assigneeId!), ...givers.map((g) => g.userId)]);
  recipients.delete(ctx.userId);
  recipients.delete(ai.id);
  // Claim the send first, so two clicks can't notify twice.
  const claimed = await prisma.impactFollowup.updateMany({ where: { projectSlug, storySharedAt: null }, data: { storySharedAt: new Date() } });
  if (!claimed.count) return { error: "Berättelsen är redan skickad." };
  for (const userId of recipients) {
    await createNotification({
      userId,
      type: "impact_story",
      title: `Det här gjorde ni möjligt — ${project?.title ?? ""}`,
      body: followup.story.slice(0, 280),
      url: `/projects/${projectSlug}/impactfasen?step=sdg_impact_measured`,
    });
  }
  done(projectSlug);
  return { sent: recipients.size };
}

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

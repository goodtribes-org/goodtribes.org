"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, isRealMember, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { aiGateMessage, type AiGateBlockReason } from "@/lib/aiMode";
import { InsightError } from "@/lib/ideaInsights";
import { logger } from "@/lib/logger";
import { appendLogEntry, LANSERING_SECTIONS, startLanseringFill, summarizePilotResults, type LanseringSection } from "@/lib/lanseringFill";

async function requireProject(projectSlug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true, slug: true } });
  return project ? { project, userId: session.user.id } : null;
}

function done(projectSlug: string) {
  revalidatePath(`/projects/${projectSlug}/lansering`);
  return {};
}

// "Låt AI:n ta fram utkast" (all sections) and "Försök igen" (one).
export async function startLanseringDrafts(projectSlug: string, section?: string): Promise<{ error?: string }> {
  const ctx = await requireProject(projectSlug);
  if (!ctx || !(await hasProjectRole(ctx.project.id, ctx.userId, PROJECT_LEAD_ROLES))) return { error: "Forbidden" };
  if (section && !LANSERING_SECTIONS.includes(section as LanseringSection)) return { error: "Okänd sektion" };
  if (!(await isAiProjectStartAvailable(ctx.userId))) return { error: "AI är inte tillgänglig just nu." };
  await startLanseringFill({
    projectId: ctx.project.id,
    projectSlug: ctx.project.slug,
    userId: ctx.userId,
    only: section ? [section as LanseringSection] : undefined,
  });
  return done(projectSlug);
}

// "Logga en lärdom": one dated line in the pilot log. Anyone on the team
// (not followers) can log — the pilot is run by the whole team. The first
// entry ticks "Genomföra piloten och dokumentera lärdomar löpande".
export async function addPilotLogEntry(projectSlug: string, text: string): Promise<{ error?: string }> {
  const ctx = await requireProject(projectSlug);
  if (!ctx || !(await isRealMember(ctx.project.id, ctx.userId))) return { error: "Forbidden" };
  const entry = text.trim().slice(0, 2000);
  if (!entry) return { error: "Skriv något först" };
  await prisma.$transaction(async (tx) => {
    const current = await tx.pilotEvaluation.findUnique({ where: { projectSlug: ctx.project.slug }, select: { executionNotes: true } });
    const executionNotes = appendLogEntry(current?.executionNotes ?? null, new Date(), entry);
    await tx.pilotEvaluation.upsert({
      where: { projectSlug: ctx.project.slug },
      create: { projectSlug: ctx.project.slug, executionNotes, updatedById: ctx.userId },
      update: { executionNotes, updatedById: ctx.userId },
    });
    await tx.initiativeChecklistItem.upsert({
      where: { projectId_itemKey: { projectId: ctx.project.id, itemKey: "pilot_executed_documented" } },
      create: { projectId: ctx.project.id, phase: "PRODUCTION", itemKey: "pilot_executed_documented", completedAt: new Date(), completedById: ctx.userId },
      update: {},
    });
  });
  return done(projectSlug);
}

// "Sammanfatta resultaten": an AI draft of the results from the log and
// the impact values. Replacing an existing summary needs `replace` — the
// page asks first.
export async function summarizeResults(projectSlug: string, replace: boolean): Promise<{ error?: string }> {
  const ctx = await requireProject(projectSlug);
  if (!ctx || !(await hasProjectRole(ctx.project.id, ctx.userId, PROJECT_LEAD_ROLES))) return { error: "Forbidden" };
  if (!(await isAiProjectStartAvailable(ctx.userId))) return { error: "AI är inte tillgänglig just nu." };
  const current = await prisma.pilotEvaluation.findUnique({ where: { projectSlug: ctx.project.slug }, select: { resultsSummary: true } });
  if (current?.resultsSummary?.trim() && !replace) return { error: "Det finns redan en sammanfattning." };
  try {
    const resultsSummary = await summarizePilotResults(ctx.project.id, ctx.project.slug, ctx.userId);
    await prisma.pilotEvaluation.update({ where: { projectSlug: ctx.project.slug }, data: { resultsSummary, updatedById: ctx.userId } });
  } catch (err) {
    const reason = err instanceof InsightError ? err.message : "";
    if (!(err instanceof InsightError) || reason === "empty") logger.error("pilot results summary failed", { err: String(err) });
    if (reason === "no_log") return { error: "Logga minst en lärdom från piloten först." };
    if (reason === "budget_exceeded" || reason === "rate_limited" || reason === "mode" || reason === "not_configured") {
      return { error: aiGateMessage(reason as AiGateBlockReason) };
    }
    return { error: "Kunde inte göra det just nu — försök igen." };
  }
  return done(projectSlug);
}

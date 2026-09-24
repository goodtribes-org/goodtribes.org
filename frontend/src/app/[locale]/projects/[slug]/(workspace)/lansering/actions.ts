"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, isRealMember, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { aiGateMessage, resolveAiMode, type AiGateBlockReason } from "@/lib/aiMode";
import { startEtableraFill } from "@/lib/etableraFill";
import { InsightError } from "@/lib/ideaInsights";
import { logger } from "@/lib/logger";
import { appendLogEntry, LANSERING_SECTIONS, startLanseringFill, summarizePilotResults, type LanseringSection } from "@/lib/lanseringFill";
import type { PhaseGateOutcome } from "@prisma/client";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { latestInsight } from "@/lib/ideaInsights";
import {
  cardWords,
  cardsForLanseringDecision,
  lanseringGateCriteria,
  missingCriteria,
  pilotDecisionFor,
  runLanseringGateBrief,
  type GateBrief,
} from "@/lib/phaseGate";
import { advanceProjectPhase } from "../edit/actions";
import { draftText } from "@/lib/aiLanguage";

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

// ─── Fasgrind Lansering → Etablera (pilotens go/no-go) ──────────────────────

export async function generateLanseringGateBrief(projectSlug: string): Promise<{ error?: string }> {
  const ctx = await requireProject(projectSlug);
  if (!ctx || !(await hasProjectRole(ctx.project.id, ctx.userId, PROJECT_LEAD_ROLES))) return { error: "Forbidden" };
  if (!(await isAiProjectStartAvailable(ctx.userId))) return { error: "AI är inte tillgänglig just nu." };
  try {
    await runLanseringGateBrief(ctx.project.id, ctx.project.slug, ctx.userId);
  } catch (err) {
    const reason = err instanceof InsightError ? err.message : "";
    if (!(err instanceof InsightError) || reason === "empty") logger.error("lansering-gate brief failed", { err: String(err) });
    if (reason === "budget_exceeded" || reason === "rate_limited" || reason === "mode" || reason === "not_configured") {
      return { error: aiGateMessage(reason as AiGateBlockReason) };
    }
    return { error: "Kunde inte göra det just nu — försök igen." };
  }
  return done(projectSlug);
}

const OUTCOMES: readonly PhaseGateOutcome[] = ["CONTINUE", "ADJUST", "PIVOT", "PAUSE"];

// The pilot's go/no-go — same rules as the other gates: always recorded
// with any unmet criteria. It also sets the pilot evaluation's own
// decision (CONTINUE = go; PIVOT/PAUSE = no-go; ADJUST leaves it open while
// the pilot continues) and ticks "go/no-go beslut" when one was taken.
// CONTINUE then moves the project to Etablera; ADJUST/PIVOT put what to
// measure or fix on the board; PAUSE (founder only) marks it ownerless.
export async function decideLanseringGate(projectSlug: string, outcome: string, note: string): Promise<{ error?: string; next?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  if (!OUTCOMES.includes(outcome as PhaseGateOutcome)) return { error: "Okänt beslut" };
  const decision = outcome as PhaseGateOutcome;

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true, slug: true, phase: true, contentLocale: true } });
  if (!project) return { error: "Projektet hittades inte" };
  if (project.phase !== "PRODUCTION") return { error: "Projektet är inte i Lansering längre" };
  const allowed = decision === "PAUSE"
    ? await hasProjectRole(project.id, userId, ["FOUNDER"])
    : await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES);
  if (!allowed) return { error: decision === "PAUSE" ? "Bara grundaren kan pausa projektet" : "Forbidden" };

  const [{ criteria }, brief, aiUser] = await Promise.all([
    lanseringGateCriteria(project.id, project.slug),
    latestInsight<GateBrief>(project.id, "LANSERING_GATE"),
    getAiParticipantUser(),
  ]);
  const cards = cardsForLanseringDecision(decision, brief?.content ?? null, cardWords("lansering", draftText(project.contentLocale)));
  const pilotDecision = pilotDecisionFor(decision);

  await prisma.$transaction(async (tx) => {
    await tx.phaseGateDecision.create({
      data: { projectId: project.id, fromPhase: "PRODUCTION", outcome: decision, note: note.trim() || null, missing: missingCriteria(criteria), decidedById: userId },
    });
    if (cards.length) {
      const max = await tx.kanbanCard.aggregate({ where: { projectSlug: project.slug, column: "TODO" }, _max: { order: true } });
      await tx.kanbanCard.createMany({
        data: cards.map((c, i) => ({
          projectSlug: project.slug,
          title: c.title,
          description: c.description,
          column: "TODO",
          order: (max._max.order ?? -1) + 1 + i,
          createdById: aiUser.id,
          createdByAi: true,
        })),
      });
    }
    if (pilotDecision) {
      await tx.pilotEvaluation.upsert({
        where: { projectSlug: project.slug },
        create: { projectSlug: project.slug, decision: pilotDecision, updatedById: userId },
        update: { decision: pilotDecision, updatedById: userId },
      });
      await tx.initiativeChecklistItem.upsert({
        where: { projectId_itemKey: { projectId: project.id, itemKey: "pilot_go_no_go" } },
        create: { projectId: project.id, phase: "PRODUCTION", itemKey: "pilot_go_no_go", completedAt: new Date(), completedById: userId },
        update: { completedAt: new Date(), completedById: userId },
      });
    }
    if (decision === "PAUSE") await tx.project.update({ where: { id: project.id }, data: { abandonedAt: new Date() } });
  });

  revalidatePath(`/projects/${projectSlug}`, "layout");
  if (decision !== "CONTINUE") return {};
  await advanceProjectPhase(project.slug);
  // On to the Etablera overview. In AGENT mode the AI starts drafting it
  // right away; without AI, the step-by-step guide.
  if (!(await isAiProjectStartAvailable(userId))) return { next: `/projects/${project.slug}/guide/establish` };
  const { mode } = await resolveAiMode({ projectId: project.id, feature: "project-plan", phase: "ESTABLISH" });
  if (mode === "AGENT") await startEtableraFill({ projectId: project.id, projectSlug: project.slug, userId });
  return { next: `/projects/${project.slug}/etablera` };
}

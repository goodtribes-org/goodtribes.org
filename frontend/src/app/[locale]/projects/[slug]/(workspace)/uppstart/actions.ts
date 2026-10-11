"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cardPhaseAfterGate, countOpenPhaseTasks } from "@/lib/phaseWork";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { startUppstartFill, UPPSTART_SECTIONS, type UppstartSection } from "@/lib/uppstartFill";
import type { MvpSignal, MvpType, PhaseGateOutcome } from "@prisma/client";
import { MIN_MVP_TESTS, MVP_SIGNALS, MVP_TYPES } from "@/lib/mvp";
import { DRAFT_STEPS, draftUppstartStep, summarizeMvpTests, type DraftStep, type TestSummary, type UppstartDraft } from "@/lib/uppstartDrafts";
import { getCanvasFieldLabels } from "@/lib/canvasFieldLabels";
import { logger } from "@/lib/logger";
import { aiGateMessage, resolveAiMode, type AiGateBlockReason } from "@/lib/aiMode";
import { startLanseringFill } from "@/lib/lanseringFill";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { InsightError, latestInsight } from "@/lib/ideaInsights";
import { cardsForUppstartDecision, missingCriteria, runUppstartGateBrief, uppstartGateCriteria, type GateBrief } from "@/lib/phaseGate";
import { advanceProjectPhase } from "../edit/actions";
import { draftText, normalizeContentLocale } from "@/lib/aiLanguage";
import { successCriteriaText } from "@/lib/lanseringFill";

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

// ─── De fyra stegen (#320) ──────────────────────────────────────────────────

// Text fields a lead can write on the page; successCriteria lives on the
// pilot evaluation, where Lansering reads it.
const PLAN_TEXT_FIELDS = ["hypothesis", "mvpDescription", "pilotWhere", "pilotWho", "pilotDuration", "pilotTeam", "pilotBudget"] as const;
type PlanTextField = (typeof PLAN_TEXT_FIELDS)[number];
export type UppstartPlanPatch = Partial<Record<PlanTextField | "successCriteria" | "mvpType", string>>;

const clean = (v: string) => v.trim().slice(0, 5000) || null;

export async function saveUppstartPlan(projectSlug: string, patch: UppstartPlanPatch): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  const data: Record<string, string | null> = {};
  for (const f of PLAN_TEXT_FIELDS) if (typeof patch[f] === "string") data[f] = clean(patch[f]!);
  const mvpType = typeof patch.mvpType === "string" ? (patch.mvpType ? patch.mvpType : null) : undefined;
  if (mvpType && !MVP_TYPES.includes(mvpType as MvpType)) return { error: "Okänd typ" };
  const planData = { ...data, ...(mvpType !== undefined ? { mvpType: mvpType as MvpType | null } : {}), updatedById: ctx.userId };
  await prisma.projectPlan.upsert({ where: { projectSlug }, create: { projectSlug, ...planData }, update: planData });
  if (typeof patch.successCriteria === "string") {
    const successCriteria = clean(patch.successCriteria);
    await prisma.pilotEvaluation.upsert({
      where: { projectSlug },
      create: { projectSlug, successCriteria, updatedById: ctx.userId },
      update: { successCriteria, updatedById: ctx.userId },
    });
  }
  return done(projectSlug);
}

// One person who tried the smallest version, and how strong a signal it gave.
export async function addMvpTest(projectSlug: string, who: string, happened: string, signal: string): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if (!who.trim()) return { error: "Skriv vem som provade" };
  if (!MVP_SIGNALS.includes(signal as MvpSignal)) return { error: "Välj vad som hände" };
  await prisma.mvpTest.create({
    data: { projectId: ctx.project.id, who: who.trim().slice(0, 200), happened: clean(happened), signal: signal as MvpSignal, createdById: ctx.userId },
  });
  return done(projectSlug);
}

export async function deleteMvpTest(projectSlug: string, testId: string): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  await prisma.mvpTest.deleteMany({ where: { id: testId, projectId: ctx.project.id } });
  return done(projectSlug);
}

// ─── AI-hjälp per steg (#322) ───────────────────────────────────────────────

function draftError(reason: string): string {
  if (reason === "empty") return "AI:n kom inte fram till något förslag — försök igen.";
  return aiGateMessage(reason as AiGateBlockReason);
}

// "Föreslå med AI": a draft for one step, shown on the page and saved only
// if the team picks it (through saveUppstartPlan, like their own text).
export async function suggestForStep(projectSlug: string, step: string): Promise<{ draft?: UppstartDraft; error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if (!DRAFT_STEPS.includes(step as DraftStep)) return { error: "Okänt steg" };
  try {
    const res = await draftUppstartStep(ctx.project.id, ctx.project.slug, ctx.userId, step as DraftStep);
    return res.ok ? { draft: res.value } : { error: draftError(res.reason) };
  } catch (err) {
    logger.error("uppstart step draft failed", { step, err: String(err) });
    return { error: "Kunde inte göra det just nu — försök igen." };
  }
}

export async function summarizeTests(projectSlug: string): Promise<{ summary?: TestSummary; error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if ((await prisma.mvpTest.count({ where: { projectId: ctx.project.id } })) < MIN_MVP_TESTS) return { error: "Låt minst tre personer prova först." };
  try {
    const res = await summarizeMvpTests(ctx.project.id, ctx.project.slug, ctx.userId);
    return res.ok ? { summary: res.value } : { error: draftError(res.reason) };
  } catch (err) {
    logger.error("uppstart test summary failed", { err: String(err) });
    return { error: "Kunde inte göra det just nu — försök igen." };
  }
}

// ─── Fasgrind Uppstart → Lansering ──────────────────────────────────────────────

function gateErrorMessage(err: unknown): string {
  const reason = err instanceof InsightError ? err.message : "";
  if (!(err instanceof InsightError) || reason === "empty") logger.error("uppstart-gate brief failed", { err: String(err) });
  if (reason === "budget_exceeded" || reason === "rate_limited" || reason === "mode" || reason === "not_configured") {
    return aiGateMessage(reason as AiGateBlockReason);
  }
  return "Kunde inte göra det just nu — försök igen.";
}

export async function generateUppstartGateBrief(projectSlug: string): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if (!(await isAiProjectStartAvailable(ctx.userId))) return { error: "AI är inte tillgänglig just nu." };
  try {
    await runUppstartGateBrief(ctx.project.id, ctx.project.slug, ctx.userId);
  } catch (err) {
    return { error: gateErrorMessage(err) };
  }
  return done(projectSlug);
}

const OUTCOMES: readonly PhaseGateOutcome[] = ["CONTINUE", "ADJUST", "PIVOT", "PAUSE"];

// The team's decision at the end of Uppstart — same rules as the Idé gate:
// always recorded with any unmet criteria; CONTINUE moves the project to
// Lansering (PRODUCTION, where the pilot runs; the manual "advance phase" path) and, if the pilot evaluation has
// no success criteria yet, starts it with the brief's proposal; ADJUST /
// PIVOT stay in Uppstart and put what to test or rework on the board;
// PAUSE (founder only) marks the project as ownerless. Doesn't need AI.
export async function decideUppstartGate(projectSlug: string, outcome: string, note: string): Promise<{ error?: string; next?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  if (!OUTCOMES.includes(outcome as PhaseGateOutcome)) return { error: "Okänt beslut" };
  const decision = outcome as PhaseGateOutcome;

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true, slug: true, phase: true, contentLocale: true } });
  if (!project) return { error: "Projektet hittades inte" };
  if (project.phase !== "PILOT") return { error: "Projektet är inte i Uppstart längre" };
  const allowed = decision === "PAUSE"
    ? await hasProjectRole(project.id, userId, ["FOUNDER"])
    : await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES);
  if (!allowed) return { error: decision === "PAUSE" ? "Bara grundaren kan pausa projektet" : "Forbidden" };

  const [{ criteria }, brief, fieldLabels, aiUser, evaluation] = await Promise.all([
    uppstartGateCriteria(project.id, project.slug),
    latestInsight<GateBrief>(project.id, "UPPSTART_GATE"),
    getCanvasFieldLabels(normalizeContentLocale(project.contentLocale)),
    getAiParticipantUser(),
    prisma.pilotEvaluation.findUnique({ where: { projectSlug: project.slug }, select: { successCriteria: true } }),
  ]);
  const labelFor = (key: string) => fieldLabels[key] ?? key;
  const t = draftText(project.contentLocale);
  const cards = cardsForUppstartDecision(decision, brief?.content ?? null, labelFor, t);
  const proposedCriteria = decision === "CONTINUE" && !evaluation?.successCriteria?.trim() ? brief?.content.successCriteria ?? [] : [];

  await prisma.$transaction(async (tx) => {
    const openTaskCount = await countOpenPhaseTasks(tx, project.slug, "PILOT");
    await tx.phaseGateDecision.create({
      data: { projectId: project.id, fromPhase: "PILOT", outcome: decision, note: note.trim() || null, missing: missingCriteria(criteria), openTaskCount, decidedById: userId },
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
          phase: cardPhaseAfterGate("PILOT", decision),
        })),
      });
    }
    if (proposedCriteria.length) {
      // A starting point for the pilot's first step — marked as the AI's
      // proposal, not ticked as done: the team sets the real levels.
      const successCriteria = successCriteriaText(proposedCriteria, t, "gateProposalSuffix");
      await tx.pilotEvaluation.upsert({
        where: { projectSlug: project.slug },
        create: { projectSlug: project.slug, successCriteria, updatedById: aiUser.id },
        update: { successCriteria, updatedById: aiUser.id },
      });
    }
    if (decision === "PAUSE") await tx.project.update({ where: { id: project.id }, data: { abandonedAt: new Date() } });
  });

  revalidatePath(`/projects/${projectSlug}`, "layout");
  if (decision !== "CONTINUE") return {};
  await advanceProjectPhase(project.slug);
  // On to the next phase page (#309). With AI and in AGENT mode it starts
  // drafting right away; without AI the page is there to fill in by hand.
  if (await isAiProjectStartAvailable(userId)) {
    const { mode } = await resolveAiMode({ projectId: project.id, feature: "project-plan", phase: "PRODUCTION" });
    if (mode === "AGENT") await startLanseringFill({ projectId: project.id, projectSlug: project.slug, userId });
  }
  return { next: `/projects/${project.slug}/lansering` };
}

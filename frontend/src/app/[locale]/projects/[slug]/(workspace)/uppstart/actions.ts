"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { startUppstartFill, UPPSTART_SECTIONS, type UppstartSection } from "@/lib/uppstartFill";
import type { PhaseGateOutcome } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { logger } from "@/lib/logger";
import { aiGateMessage, resolveAiMode, type AiGateBlockReason } from "@/lib/aiMode";
import { startLanseringFill } from "@/lib/lanseringFill";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { InsightError, latestInsight } from "@/lib/ideaInsights";
import { cardsForUppstartDecision, missingCriteria, runUppstartGateBrief, uppstartGateCriteria, type GateBrief } from "@/lib/phaseGate";
import { LEAN_CANVAS_BLOCKS } from "../lean-canvas/fields";
import { VALUE_PROPOSITION_BLOCKS } from "../value-proposition/fields";
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

  const [{ criteria }, brief, tLc, tVp, aiUser, evaluation] = await Promise.all([
    uppstartGateCriteria(project.id, project.slug),
    latestInsight<GateBrief>(project.id, "UPPSTART_GATE"),
    getTranslations({ locale: normalizeContentLocale(project.contentLocale), namespace: "LeanCanvasHistory" }),
    getTranslations({ locale: normalizeContentLocale(project.contentLocale), namespace: "ValuePropositionHistory" }),
    getAiParticipantUser(),
    prisma.pilotEvaluation.findUnique({ where: { projectSlug: project.slug }, select: { successCriteria: true } }),
  ]);
  const labelFor = (key: string) => {
    const [entity, field] = key.split(".");
    const lc = LEAN_CANVAS_BLOCKS.find((b) => b.field === field);
    const vp = VALUE_PROPOSITION_BLOCKS.find((b) => b.field === field);
    if (entity === "leanCanvas" && lc) return tLc(`field${lc.translationKey}` as Parameters<typeof tLc>[0]);
    if (entity === "valueProposition" && vp) return tVp(`field${vp.translationKey}` as Parameters<typeof tVp>[0]);
    return key;
  };
  const t = draftText(project.contentLocale);
  const cards = cardsForUppstartDecision(decision, brief?.content ?? null, labelFor, t);
  const proposedCriteria = decision === "CONTINUE" && !evaluation?.successCriteria?.trim() ? brief?.content.successCriteria ?? [] : [];

  await prisma.$transaction(async (tx) => {
    await tx.phaseGateDecision.create({
      data: { projectId: project.id, fromPhase: "PILOT", outcome: decision, note: note.trim() || null, missing: missingCriteria(criteria), decidedById: userId },
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
  // On to the Lansering overview. In AGENT mode the AI starts drafting it
  // right away; without AI, the step-by-step guide.
  if (!(await isAiProjectStartAvailable(userId))) return { next: `/projects/${project.slug}/guide/production` };
  const { mode } = await resolveAiMode({ projectId: project.id, feature: "project-plan", phase: "PRODUCTION" });
  if (mode === "AGENT") await startLanseringFill({ projectId: project.id, projectSlug: project.slug, userId });
  return { next: `/projects/${project.slug}/lansering` };
}

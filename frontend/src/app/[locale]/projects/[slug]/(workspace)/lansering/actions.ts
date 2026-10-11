"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cardPhaseAfterGate, countOpenPhaseTasks } from "@/lib/phaseWork";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, isRealMember, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { aiGateMessage, resolveAiMode, type AiGateBlockReason } from "@/lib/aiMode";
import { startEtableraFill } from "@/lib/etableraFill";
import { InsightError } from "@/lib/ideaInsights";
import { logger } from "@/lib/logger";
import { addCriterionMetrics, appendLogEntry, LANSERING_SECTIONS, PLAN_FORWARD_FIELDS, startLanseringFill, type LanseringSection } from "@/lib/lanseringFill";
import { draftLansering, LANSERING_DRAFT_KINDS, type LanseringDraft, type LanseringDraftKind } from "@/lib/lanseringDrafts";
import { OUTCOMES as PILOT_OUTCOMES, withResult, type Outcome } from "@/lib/pilot";
import type { PhaseGateOutcome, Prisma } from "@prisma/client";
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
// (not followers) can log — the pilot is run by the whole team. "Följ
// piloten" counts as done from three entries (lib/pilot.ts), not by a tick.
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
  });
  return done(projectSlug);
}

// ─── Lanseringens steg (#327) ───────────────────────────────────────────────

async function requireLeadCtx(projectSlug: string) {
  const ctx = await requireProject(projectSlug);
  if (!ctx || !(await hasProjectRole(ctx.project.id, ctx.userId, PROJECT_LEAD_ROLES))) return null;
  return ctx;
}

// "Starta piloten": the start date (yyyy-mm-dd), or none.
export async function setPilotStart(projectSlug: string, date: string | null): Promise<{ error?: string }> {
  const ctx = await requireLeadCtx(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  const startedAt = date ? new Date(`${date}T12:00:00Z`) : null;
  if (startedAt && Number.isNaN(startedAt.getTime())) return { error: "Ogiltigt datum" };
  await prisma.pilotEvaluation.upsert({
    where: { projectSlug },
    create: { projectSlug, startedAt, updatedById: ctx.userId },
    update: { startedAt, updatedById: ctx.userId },
  });
  return done(projectSlug);
}

// A metric for one success criterion, tied to it — by hand or the team
// picking one of the AI's suggestions.
export async function addMetricForCriterion(
  projectSlug: string,
  criterion: string,
  label: string,
  unit: string,
  target: string,
): Promise<{ error?: string }> {
  const ctx = await requireLeadCtx(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if (!label.trim() || !unit.trim()) return { error: "Skriv vad som räknas och i vilken enhet" };
  const t = target.trim() ? Number(target.replace(",", ".")) : null;
  if (t !== null && (!Number.isFinite(t) || t <= 0)) return { error: "Målet behöver vara ett tal" };
  const added = await addCriterionMetrics(projectSlug, async (open) =>
    open.includes(criterion) ? [{ criterion, label: label.trim().slice(0, 120), unit: unit.trim().slice(0, 40), targetValue: t, description: "" }] : [],
  );
  if (!added) return { error: "Kriteriet har redan ett mätetal" };
  return done(projectSlug);
}

// A new value for a metric, from "Följ piloten". Everyone on the team runs
// the pilot, so every member may report (followers may not).
export async function reportMetricValue(projectSlug: string, metricId: string, value: string, note: string): Promise<{ error?: string }> {
  const ctx = await requireProject(projectSlug);
  if (!ctx || !(await isRealMember(ctx.project.id, ctx.userId))) return { error: "Forbidden" };
  const v = Number(value.replace(",", "."));
  if (!value.trim() || !Number.isFinite(v)) return { error: "Skriv ett tal" };
  const metric = await prisma.impactMetric.findFirst({ where: { id: metricId, projectSlug }, select: { id: true } });
  if (!metric) return { error: "Mätetalet hittades inte" };
  await prisma.$transaction([
    prisma.impactUpdate.create({ data: { impactMetricId: metricId, value: v, note: note.trim().slice(0, 500) || null, updatedById: ctx.userId } }),
    prisma.impactMetric.update({ where: { id: metricId }, data: { currentValue: v } }),
  ]);
  revalidatePath(`/projects/${projectSlug}/impact`);
  return done(projectSlug);
}

// "Vad visade piloten?": how one criterion went, in the team's own words.
export async function setCriterionOutcome(projectSlug: string, criterion: string, outcome: string | null, note: string): Promise<{ error?: string }> {
  const ctx = await requireLeadCtx(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if (outcome && !PILOT_OUTCOMES.includes(outcome as Outcome)) return { error: "Okänt utfall" };
  const evaluation = await prisma.pilotEvaluation.findUnique({ where: { projectSlug }, select: { criteriaResults: true } });
  const criteriaResults = withResult(evaluation?.criteriaResults, criterion, { outcome: (outcome as Outcome) || null, note: note.trim().slice(0, 1000) || null });
  await prisma.pilotEvaluation.upsert({
    where: { projectSlug },
    create: { projectSlug, criteriaResults: criteriaResults as Prisma.InputJsonValue, updatedById: ctx.userId },
    update: { criteriaResults: criteriaResults as Prisma.InputJsonValue, updatedById: ctx.userId },
  });
  return done(projectSlug);
}

export async function saveResultsSummary(projectSlug: string, patch: Record<string, string>): Promise<{ error?: string }> {
  const ctx = await requireLeadCtx(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  const resultsSummary = (patch.resultsSummary ?? "").trim().slice(0, 5000) || null;
  await prisma.pilotEvaluation.upsert({
    where: { projectSlug },
    create: { projectSlug, resultsSummary, updatedById: ctx.userId },
    update: { resultsSummary, updatedById: ctx.userId },
  });
  return done(projectSlug);
}

// "Plan framåt", stored in LaunchPlan (PLAN_FORWARD_FIELDS).
export async function savePlanForward(projectSlug: string, patch: Record<string, string>): Promise<{ error?: string }> {
  const ctx = await requireLeadCtx(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  const data: Record<string, string | null> = {};
  for (const f of PLAN_FORWARD_FIELDS) if (typeof patch[f] === "string") data[f] = patch[f].trim().slice(0, 5000) || null;
  await prisma.launchPlan.upsert({ where: { projectSlug }, create: { projectSlug, ...data, updatedById: ctx.userId }, update: { ...data, updatedById: ctx.userId } });
  return done(projectSlug);
}

// "Föreslå med AI" in Lansering (#327): drafts only, saved by the team.
export async function suggestLansering(projectSlug: string, kind: string): Promise<{ draft?: LanseringDraft; error?: string }> {
  const ctx = await requireLeadCtx(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if (!LANSERING_DRAFT_KINDS.includes(kind as LanseringDraftKind)) return { error: "Okänt förslag" };
  try {
    const res = await draftLansering(ctx.project.id, ctx.project.slug, ctx.userId, kind as LanseringDraftKind);
    if (res.ok) return { draft: res.value };
    if (res.reason === "no_log") return { error: "Logga minst en lärdom från piloten först." };
    if (res.reason === "no_criteria") return { error: "Skriv framgångskriterierna först." };
    if (res.reason === "empty") return { error: "AI:n kom inte fram till något förslag — försök igen." };
    return { error: aiGateMessage(res.reason as AiGateBlockReason) };
  } catch (err) {
    logger.error("lansering draft failed", { kind, err: String(err) });
    return { error: "Kunde inte göra det just nu — försök igen." };
  }
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
    const openTaskCount = await countOpenPhaseTasks(tx, project.slug, "PRODUCTION");
    await tx.phaseGateDecision.create({
      data: { projectId: project.id, fromPhase: "PRODUCTION", outcome: decision, note: note.trim() || null, missing: missingCriteria(criteria), openTaskCount, decidedById: userId },
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
          phase: cardPhaseAfterGate("PRODUCTION", decision),
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
  // On to the next phase page (#309). With AI and in AGENT mode it starts
  // drafting right away; without AI the page is there to fill in by hand.
  if (await isAiProjectStartAvailable(userId)) {
    const { mode } = await resolveAiMode({ projectId: project.id, feature: "project-plan", phase: "ESTABLISH" });
    if (mode === "AGENT") await startEtableraFill({ projectId: project.id, projectSlug: project.slug, userId });
  }
  return { next: `/projects/${project.slug}/etablera` };
}

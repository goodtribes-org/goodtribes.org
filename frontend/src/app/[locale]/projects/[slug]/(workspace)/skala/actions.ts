"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { latestInsight } from "@/lib/ideaInsights";
import { SKALA_SECTIONS, startSkalaFill, type SkalaSection } from "@/lib/skalaFill";
import { cardWords, cardsForLanseringDecision, skalaGateCriteria, runSkalaGateBrief, type GateBrief } from "@/lib/phaseGate";
import { checkGateDecider, gateBriefErrorMessage, recordGateDecision } from "@/lib/gateDecision";
import { advanceProjectPhase } from "../edit/actions";
import { draftText } from "@/lib/aiLanguage";
import { aiGateMessage, resolveAiMode } from "@/lib/aiMode";
import type { ScalingPath } from "@prisma/client";
import { OPENS_REPLICATION, SCALING_PATHS } from "@/lib/scaling";
import { draftSkala, SKALA_DRAFT_KINDS, type SkalaDraft, type SkalaDraftKind } from "@/lib/skalaDrafts";
import { createWikiPage, wikiPageExists } from "@/lib/phaseFill";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { logger } from "@/lib/logger";
import { startImpactFill } from "@/lib/impactPhaseFill";

async function requireLead(projectSlug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true, slug: true } });
  if (!project || !(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return null;
  return { project, userId: session.user.id };
}

// "Låt AI:n ta fram utkast" (all sections) and "Försök igen" (one).
export async function startSkalaDrafts(projectSlug: string, section?: string): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if (section && !SKALA_SECTIONS.includes(section as SkalaSection)) return { error: "Okänd sektion" };
  if (!(await isAiProjectStartAvailable(ctx.userId))) return { error: "AI är inte tillgänglig just nu." };
  await startSkalaFill({ projectId: ctx.project.id, projectSlug: ctx.project.slug, userId: ctx.userId, only: section ? [section as SkalaSection] : undefined });
  revalidatePath(`/projects/${projectSlug}/skala`);
  return {};
}

// ─── Skalas steg (#331) ─────────────────────────────────────────────────────

function done(projectSlug: string) {
  revalidatePath(`/projects/${projectSlug}/skala`);
  return {};
}

const PLAN_TEXT_FIELDS = ["goals", "geographies", "coreFixed", "coreAdaptable", "teamOrLicenseModel", "capitalPlan"] as const;

// The plan's texts, from any step (only the fields sent are changed).
export async function saveScalingPlan(projectSlug: string, patch: Record<string, string>): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  const data: Record<string, string | null> = {};
  for (const f of PLAN_TEXT_FIELDS) if (typeof patch[f] === "string") data[f] = patch[f].trim().slice(0, 5000) || null;
  await prisma.scalingPlan.upsert({ where: { projectSlug }, create: { projectSlug, ...data, updatedById: ctx.userId }, update: { ...data, updatedById: ctx.userId } });
  return done(projectSlug);
}

// "Hur ni växer": the way is saved, and the ways where others start their
// own open the project for that (the same flag as the toggle on /scale).
export async function setGrowthPath(projectSlug: string, path: string | null): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if (path && !SCALING_PATHS.includes(path as ScalingPath)) return { error: "Okänt val" };
  const growthPath = (path as ScalingPath) || null;
  await prisma.$transaction(async (tx) => {
    await tx.scalingPlan.upsert({ where: { projectSlug }, create: { projectSlug, growthPath, updatedById: ctx.userId }, update: { growthPath, updatedById: ctx.userId } });
    if (growthPath && OPENS_REPLICATION.includes(growthPath)) await tx.project.update({ where: { id: ctx.project.id }, data: { openForReplication: true } });
  });
  return done(projectSlug);
}

export async function suggestSkala(projectSlug: string, kind: string): Promise<{ draft?: SkalaDraft; error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if (!SKALA_DRAFT_KINDS.includes(kind as SkalaDraftKind)) return { error: "Okänt förslag" };
  try {
    const res = await draftSkala(ctx.project.id, ctx.project.slug, ctx.userId, kind as SkalaDraftKind);
    if (res.ok) return { draft: res.value };
    if (res.reason === "empty") return { error: "AI:n kom inte fram till något förslag — försök igen." };
    return { error: aiGateMessage(res.reason) };
  } catch (err) {
    logger.error("skala draft failed", { kind, err: String(err) });
    return { error: "Kunde inte göra det just nu — försök igen." };
  }
}

// The AI's comparison of the four ways, saved as the "skalningsval" page
// when the team keeps it (only if there's none yet).
export async function keepGrowthComparison(projectSlug: string, html: string): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if (await wikiPageExists(projectSlug, "skalningsval")) return { error: "Det finns redan en jämförelse." };
  const project = await prisma.project.findUnique({ where: { id: ctx.project.id }, select: { contentLocale: true } });
  await createWikiPage(projectSlug, "skalningsval", draftText(project?.contentLocale).titleScaleChoice, sanitizeHtml(html), ctx.userId);
  return done(projectSlug);
}

// ─── Fasgrind Skala → Impact ──────────────────────────────────────────────

export async function generateSkalaGateBrief(projectSlug: string): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if (!(await isAiProjectStartAvailable(ctx.userId))) return { error: "AI är inte tillgänglig just nu." };
  try {
    await runSkalaGateBrief(ctx.project.id, ctx.project.slug, ctx.userId);
  } catch (err) {
    return { error: gateBriefErrorMessage(err, "skala-gate") };
  }
  revalidatePath(`/projects/${projectSlug}/skala`);
  return {};
}

// Scaled far enough? CONTINUE moves the project to Impact; ADJUST / PIVOT put
// what to follow up or reach on the board; PAUSE (founder only) marks it
// ownerless. Always recorded with any unmet criteria.
export async function decideSkalaGate(projectSlug: string, outcome: string, note: string): Promise<{ error?: string; next?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const check = await checkGateDecider(projectSlug, "SCALE", outcome, session.user.id);
  if ("error" in check) return check;
  const { project, decision } = check;

  const [{ criteria }, brief] = await Promise.all([skalaGateCriteria(project.id, project.slug), latestInsight<GateBrief>(project.id, "SKALA_GATE")]);
  await recordGateDecision({
    project,
    fromPhase: "SCALE",
    decision,
    note,
    criteria,
    cards: cardsForLanseringDecision(decision, brief?.content ?? null, cardWords("skala", draftText(project.contentLocale))),
    userId: session.user.id,
  });

  revalidatePath(`/projects/${projectSlug}`, "layout");
  if (decision !== "CONTINUE") return {};
  await advanceProjectPhase(project.slug);
  // On to the next phase page (#309). With AI and in AGENT mode it starts
  // drafting right away; without AI the page is there to fill in by hand.
  if (await isAiProjectStartAvailable(session.user.id)) {
    const { mode } = await resolveAiMode({ projectId: project.id, feature: "project-plan", phase: "IMPACT" });
    if (mode === "AGENT") await startImpactFill({ projectId: project.id, projectSlug: project.slug, userId: session.user.id });
  }
  return { next: `/projects/${project.slug}/impactfasen` };
}

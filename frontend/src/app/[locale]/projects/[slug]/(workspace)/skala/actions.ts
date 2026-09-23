"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { latestInsight } from "@/lib/ideaInsights";
import { SKALA_SECTIONS, startSkalaFill, type SkalaSection } from "@/lib/skalaFill";
import { cardsForLanseringDecision, SKALA_CARD_WORDS, skalaGateCriteria, runSkalaGateBrief, type GateBrief } from "@/lib/phaseGate";
import { checkGateDecider, gateBriefErrorMessage, recordGateDecision } from "@/lib/gateDecision";
import { advanceProjectPhase } from "../edit/actions";

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
    cards: cardsForLanseringDecision(decision, brief?.content ?? null, SKALA_CARD_WORDS),
    userId: session.user.id,
  });

  revalidatePath(`/projects/${projectSlug}`, "layout");
  if (decision !== "CONTINUE") return {};
  await advanceProjectPhase(project.slug);
  return { next: `/projects/${project.slug}/guide/impact` };
}

"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { latestInsight } from "@/lib/ideaInsights";
import { ETABLERA_SECTIONS, startEtableraFill, type EtableraSection } from "@/lib/etableraFill";
import { cardsForLanseringDecision, ETABLERA_CARD_WORDS, etableraGateCriteria, runEtableraGateBrief, type GateBrief } from "@/lib/phaseGate";
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
export async function startEtableraDrafts(projectSlug: string, section?: string): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if (section && !ETABLERA_SECTIONS.includes(section as EtableraSection)) return { error: "Okänd sektion" };
  if (!(await isAiProjectStartAvailable(ctx.userId))) return { error: "AI är inte tillgänglig just nu." };
  await startEtableraFill({ projectId: ctx.project.id, projectSlug: ctx.project.slug, userId: ctx.userId, only: section ? [section as EtableraSection] : undefined });
  revalidatePath(`/projects/${projectSlug}/etablera`);
  return {};
}

// ─── Fasgrind Etablera → Skala ──────────────────────────────────────────────

export async function generateEtableraGateBrief(projectSlug: string): Promise<{ error?: string }> {
  const ctx = await requireLead(projectSlug);
  if (!ctx) return { error: "Forbidden" };
  if (!(await isAiProjectStartAvailable(ctx.userId))) return { error: "AI är inte tillgänglig just nu." };
  try {
    await runEtableraGateBrief(ctx.project.id, ctx.project.slug, ctx.userId);
  } catch (err) {
    return { error: gateBriefErrorMessage(err, "etablera-gate") };
  }
  revalidatePath(`/projects/${projectSlug}/etablera`);
  return {};
}

// Ready to scale? CONTINUE moves the project to Skala; ADJUST / PIVOT put
// what to strengthen or fix on the board; PAUSE (founder only) marks it
// ownerless. Always recorded with any unmet criteria.
export async function decideEtableraGate(projectSlug: string, outcome: string, note: string): Promise<{ error?: string; next?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const check = await checkGateDecider(projectSlug, "ESTABLISH", outcome, session.user.id);
  if ("error" in check) return check;
  const { project, decision } = check;

  const [{ criteria }, brief] = await Promise.all([etableraGateCriteria(project.id, project.slug), latestInsight<GateBrief>(project.id, "ETABLERA_GATE")]);
  await recordGateDecision({
    project,
    fromPhase: "ESTABLISH",
    decision,
    note,
    criteria,
    cards: cardsForLanseringDecision(decision, brief?.content ?? null, ETABLERA_CARD_WORDS),
    userId: session.user.id,
  });

  revalidatePath(`/projects/${projectSlug}`, "layout");
  if (decision !== "CONTINUE") return {};
  await advanceProjectPhase(project.slug);
  return { next: `/projects/${project.slug}/guide/scale` };
}

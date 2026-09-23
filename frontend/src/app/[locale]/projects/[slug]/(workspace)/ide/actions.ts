"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { buildTranscript, runIdeaFill, type FillSection } from "@/lib/ideaFill";
import { InsightError, runCritique, runInterviewSynthesis } from "@/lib/ideaInsights";
import { aiGateMessage, type AiGateBlockReason } from "@/lib/aiMode";
import { markChecklistDone } from "../../guide/actions";
import { logger } from "@/lib/logger";
import type { PhaseGateOutcome } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { cardsForDecision, ideaGateCriteria, missingCriteria, runGateBrief, type GateBrief } from "@/lib/phaseGate";
import { latestInsight, type SynthesisContent } from "@/lib/ideaInsights";
import { LEAN_CANVAS_BLOCKS, LEAN_CANVAS_FIELDS } from "../lean-canvas/fields";
import { VALUE_PROPOSITION_BLOCKS, VALUE_PROPOSITION_FIELDS } from "../value-proposition/fields";
import { advanceProjectPhase } from "../edit/actions";

const RETRYABLE: readonly FillSection[] = ["leanCanvas", "valueProposition", "marketScan", "interviewGuide", "critique"];

// "Försök igen" for a section the AI couldn't fill (failed, or cut short).
// Same background fill as after the conversation, for just that section.
export async function retryIdeaFillSection(projectSlug: string, section: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!RETRYABLE.includes(section as FillSection)) throw new Error("Okänd sektion");
  if (!(await isAiProjectStartAvailable(session.user.id))) throw new Error("AI är inte tillgänglig just nu");

  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true, slug: true, dreamConversation: { select: { id: true, roomId: true, aiMode: true } } },
  });
  if (!project?.dreamConversation) throw new Error("Projektet hittades inte");
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) throw new Error("Forbidden");

  const dream = project.dreamConversation;
  await prisma.$executeRaw`
    UPDATE "DreamConversation"
    SET "fillStatus" = COALESCE("fillStatus", '{}'::jsonb) || jsonb_build_object(${section}::text, 'pending'::text),
        "updatedAt" = NOW()
    WHERE id = ${dream.id}`;
  const transcript = await buildTranscript(dream.roomId);
  void runIdeaFill({
    dreamId: dream.id,
    projectId: project.id,
    projectSlug: project.slug,
    mode: dream.aiMode,
    transcript,
    userId: session.user.id,
    only: [section as FillSection],
  });
  revalidatePath(`/projects/${projectSlug}/ide`);
}

async function requireLeadProject(projectSlug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isAiProjectStartAvailable(session.user.id))) throw new Error("AI är inte tillgänglig just nu");
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true, slug: true } });
  if (!project) throw new Error("Projektet hittades inte");
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) throw new Error("Forbidden");
  return { project, userId: session.user.id };
}

function insightErrorMessage(err: unknown): string {
  const reason = err instanceof InsightError ? err.message : "";
  if (!(err instanceof InsightError) || reason === "empty") logger.error("idea-insight failed", { err: String(err) });
  if (reason === "budget_exceeded" || reason === "rate_limited" || reason === "mode" || reason === "not_configured") {
    return aiGateMessage(reason as AiGateBlockReason);
  }
  if (reason === "no_interviews") return "Logga minst en intervju först.";
  return "Kunde inte göra det just nu — försök igen.";
}

// "Granska igen": a fresh Kritikern review of the current drafts.
export async function rerunCritique(projectSlug: string): Promise<{ error?: string }> {
  const { project, userId } = await requireLeadProject(projectSlug);
  try {
    await runCritique(project.id, userId);
  } catch (err) {
    return { error: insightErrorMessage(err) };
  }
  revalidatePath(`/projects/${projectSlug}/ide`);
  return {};
}

// "Sammanfatta intervjuerna": learnings plus a verdict per assumption,
// grounded in the logged interviews. Three or more interviews tick the
// checklist item — that's the Idé phase's minimum.
export async function synthesizeInterviews(projectSlug: string): Promise<{ error?: string }> {
  const { project, userId } = await requireLeadProject(projectSlug);
  try {
    const synthesis = await runInterviewSynthesis(project.id, project.slug, userId);
    if (synthesis.interviewCount >= 3) await markChecklistDone(project.id, "target_audience_interviews", userId);
  } catch (err) {
    return { error: insightErrorMessage(err) };
  }
  revalidatePath(`/projects/${projectSlug}/ide`);
  return {};
}

// ─── Fasgrind Idé → Uppstart ────────────────────────────────────────────────

export async function generateGateBrief(projectSlug: string): Promise<{ error?: string }> {
  const { project, userId } = await requireLeadProject(projectSlug);
  try {
    await runGateBrief(project.id, project.slug, userId);
  } catch (err) {
    return { error: insightErrorMessage(err) };
  }
  revalidatePath(`/projects/${projectSlug}/ide`);
  return {};
}

const OUTCOMES: readonly PhaseGateOutcome[] = ["CONTINUE", "ADJUST", "PIVOT", "PAUSE"];

// The initiativtagare's decision at the gate. Always recorded — with any
// unmet criteria — then: CONTINUE moves the project to Uppstart (the same
// path as the manual "advance phase", after saving the canvases as a
// version); ADJUST / PIVOT stay in Idé and put what needs testing or
// reworking on the board; PAUSE marks the project as ownerless so others
// can take over (founder only, same rule as elsewhere). Doesn't need AI.
export async function decideIdeaGate(projectSlug: string, outcome: string, note: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  if (!OUTCOMES.includes(outcome as PhaseGateOutcome)) return { error: "Okänt beslut" };
  const decision = outcome as PhaseGateOutcome;

  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true, slug: true, phase: true, leanCanvas: true, valueProposition: true },
  });
  if (!project) return { error: "Projektet hittades inte" };
  if (project.phase !== "IDEA" && project.phase !== "SPRINT") return { error: "Projektet är inte i Idéfasen längre" };
  const allowed = decision === "PAUSE"
    ? await hasProjectRole(project.id, userId, ["FOUNDER"])
    : await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES);
  if (!allowed) return { error: decision === "PAUSE" ? "Bara grundaren kan pausa projektet" : "Forbidden" };

  const { criteria } = await ideaGateCriteria(project.id, project.slug);
  const [synthesis, brief, tLc, tVp, aiUser] = await Promise.all([
    latestInsight<SynthesisContent>(project.id, "INTERVIEW_SYNTHESIS"),
    latestInsight<GateBrief>(project.id, "PHASE_GATE"),
    getTranslations({ locale: "sv", namespace: "LeanCanvasHistory" }),
    getTranslations({ locale: "sv", namespace: "ValuePropositionHistory" }),
    getAiParticipantUser(),
  ]);
  const labelFor = (key: string) => {
    const [entity, field] = key.split(".");
    const lc = LEAN_CANVAS_BLOCKS.find((b) => b.field === field);
    const vp = VALUE_PROPOSITION_BLOCKS.find((b) => b.field === field);
    if (entity === "leanCanvas" && lc) return tLc(`field${lc.translationKey}` as Parameters<typeof tLc>[0]);
    if (entity === "valueProposition" && vp) return tVp(`field${vp.translationKey}` as Parameters<typeof tVp>[0]);
    return key;
  };
  const cards = cardsForDecision(decision, synthesis?.content ?? null, brief?.content ?? null, labelFor);

  await prisma.$transaction(async (tx) => {
    await tx.phaseGateDecision.create({
      data: {
        projectId: project.id,
        fromPhase: project.phase,
        outcome: decision,
        note: note.trim() || null,
        missing: missingCriteria(criteria),
        decidedById: userId,
      },
    });
    if (cards.length) {
      await tx.kanbanCard.createMany({
        data: cards.map((c, i) => ({
          projectSlug: project.slug,
          title: c.title,
          description: c.description,
          column: "TODO",
          order: i,
          createdById: aiUser.id,
          createdByAi: true,
        })),
      });
    }
    if (decision === "CONTINUE") {
      // The canvases as they were when the phase was closed.
      if (project.leanCanvas) {
        const lc = project.leanCanvas as Record<string, unknown>;
        await tx.leanCanvasVersion.create({
          data: { projectSlug: project.slug, savedById: userId, ...Object.fromEntries(LEAN_CANVAS_FIELDS.map((f) => [f, lc[f] ?? null])) },
        });
      }
      if (project.valueProposition) {
        const vp = project.valueProposition as Record<string, unknown>;
        await tx.valuePropositionVersion.create({
          data: { projectSlug: project.slug, savedById: userId, ...Object.fromEntries(VALUE_PROPOSITION_FIELDS.map((f) => [f, vp[f] ?? null])) },
        });
      }
    }
    if (decision === "PAUSE") {
      await tx.project.update({ where: { id: project.id }, data: { abandonedAt: new Date() } });
    }
  });

  if (decision === "CONTINUE") await advanceProjectPhase(project.slug);
  revalidatePath(`/projects/${projectSlug}`, "layout");
  return {};
}

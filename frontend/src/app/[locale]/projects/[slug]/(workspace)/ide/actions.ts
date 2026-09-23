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

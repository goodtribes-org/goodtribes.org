import type { PhaseGateOutcome, Prisma, ProjectPhase } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { aiGateMessage, type AiGateBlockReason } from "@/lib/aiMode";
import { InsightError } from "@/lib/ideaInsights";
import { logger } from "@/lib/logger";
import { missingCriteria, type GateCriteria } from "@/lib/phaseGate";

// Shared plumbing for the phase gates from Etablera on (the earlier gates
// inline the same steps): who may decide, recording the decision with the
// unmet criteria, cards on the board, and PAUSE marking the project
// ownerless.

export const GATE_OUTCOMES: readonly PhaseGateOutcome[] = ["CONTINUE", "ADJUST", "PIVOT", "PAUSE"];

export async function checkGateDecider(
  projectSlug: string,
  phase: ProjectPhase,
  outcome: string,
  userId: string,
): Promise<{ error: string } | { project: { id: string; slug: string }; decision: PhaseGateOutcome }> {
  if (!GATE_OUTCOMES.includes(outcome as PhaseGateOutcome)) return { error: "Okänt beslut" };
  const decision = outcome as PhaseGateOutcome;
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true, slug: true, phase: true } });
  if (!project) return { error: "Projektet hittades inte" };
  if (project.phase !== phase) return { error: "Projektet är inte i den här fasen längre" };
  const allowed = decision === "PAUSE"
    ? await hasProjectRole(project.id, userId, ["FOUNDER"])
    : await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES);
  if (!allowed) return { error: decision === "PAUSE" ? "Bara grundaren kan pausa projektet" : "Forbidden" };
  return { project: { id: project.id, slug: project.slug }, decision };
}

export async function recordGateDecision(p: {
  project: { id: string; slug: string };
  fromPhase: ProjectPhase;
  decision: PhaseGateOutcome;
  note: string;
  criteria: GateCriteria;
  cards: { title: string; description: string }[];
  userId: string;
  extra?: (tx: Prisma.TransactionClient) => Promise<void>;
}) {
  const aiUser = p.cards.length ? await getAiParticipantUser() : null;
  await prisma.$transaction(async (tx) => {
    await tx.phaseGateDecision.create({
      data: {
        projectId: p.project.id,
        fromPhase: p.fromPhase,
        outcome: p.decision,
        note: p.note.trim() || null,
        missing: missingCriteria(p.criteria),
        decidedById: p.userId,
      },
    });
    if (aiUser) {
      const max = await tx.kanbanCard.aggregate({ where: { projectSlug: p.project.slug, column: "TODO" }, _max: { order: true } });
      await tx.kanbanCard.createMany({
        data: p.cards.map((c, i) => ({
          projectSlug: p.project.slug,
          title: c.title,
          description: c.description,
          column: "TODO",
          order: (max._max.order ?? -1) + 1 + i,
          createdById: aiUser.id,
          createdByAi: true,
        })),
      });
    }
    await p.extra?.(tx);
    if (p.decision === "PAUSE") await tx.project.update({ where: { id: p.project.id }, data: { abandonedAt: new Date() } });
  });
}

export function gateBriefErrorMessage(err: unknown, label: string): string {
  const reason = err instanceof InsightError ? err.message : "";
  if (!(err instanceof InsightError) || reason === "empty") logger.error(`${label} brief failed`, { err: String(err) });
  if (reason === "budget_exceeded" || reason === "rate_limited" || reason === "mode" || reason === "not_configured") {
    return aiGateMessage(reason as AiGateBlockReason);
  }
  return "Kunde inte göra det just nu — försök igen.";
}

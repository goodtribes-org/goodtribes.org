import { prisma } from "@/lib/prisma";
import { isMoveBack, type ProjectPhaseValue } from "@/lib/projectPhase";

// Starta om från en tidigare fas (#313). Phases only go forward (PRD 4d),
// except when a team restarts — Infos: datordonation stood in Etablera when
// it was to start over. A lead (or site admin) moves the project back with a
// note; nothing is deleted. What changes is which gate decisions count: a
// gate is open again in the new run, so only decisions made after the latest
// move back are read as that gate's decision. The old ones stay in history.

// When the project last moved back, or null if it never has.
export async function lastRestartAt(projectId: string): Promise<Date | null> {
  const transitions = await prisma.phaseTransition.findMany({
    where: { projectId },
    orderBy: { changedAt: "desc" },
    select: { fromPhase: true, toPhase: true, changedAt: true },
    take: 50,
  });
  return transitions.find((t) => isMoveBack(t.fromPhase as ProjectPhaseValue | null, t.toPhase as ProjectPhaseValue))?.changedAt ?? null;
}

// The where-fragment for "decided in the current run".
export const decidedSince = (restartAt: Date | null) => (restartAt ? { createdAt: { gt: restartAt } } : {});

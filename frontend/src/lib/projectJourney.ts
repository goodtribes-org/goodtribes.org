import { prisma } from "@/lib/prisma";
import { getAutoDoneKeys } from "@/lib/projectSignals";
import { nextStep, phaseProgress, stepHref, type PhaseProgress } from "@/lib/phaseProgress";
import { type ProjectPhaseValue } from "@/lib/projectPhase";

// Where a project is on its journey: per-phase progress (the phase bars) and
// the next concrete step, with a link to where it's done. The same "done"
// rule as the project header (PhaseMenuBar): ticked checklist items plus the
// items the project's own data already proves (getAutoDoneKeys).
export type ProjectJourney = {
  progress: PhaseProgress[];
  // A ProjectPhaseChecklist key — translate it in the UI.
  nextStepKey: string | null;
  nextStepHref: string | null;
};

export async function getProjectJourney(project: { id: string; slug: string; phase: string }): Promise<ProjectJourney> {
  const [auto, ticked] = await Promise.all([
    getAutoDoneKeys(project.id, project.slug),
    prisma.initiativeChecklistItem.findMany({ where: { projectId: project.id, completedAt: { not: null } }, select: { itemKey: true } }),
  ]);
  const done = new Set([...auto, ...ticked.map((t) => t.itemKey)]);
  const phase = project.phase as ProjectPhaseValue;
  const step = nextStep(phase, done);
  const nextStepHref = step ? stepHref(project.slug, phase, step) : null;
  return { progress: phaseProgress(done), nextStepKey: step?.key ?? null, nextStepHref };
}

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isRealMember } from "@/lib/authz";
import { getAutoDoneKeys } from "@/lib/projectSignals";
import type { ProjectPhaseValue } from "@/lib/projectPhase";
import PhaseMenuBar from "./PhaseMenuBar";

// The thin phase bars at the top of each phase overview (/ide, /uppstart,
// …), so progress shows where the work is actually done — not only on the
// project page. Fetches its own data so each overview needs one line.
export default async function PhaseProgressStrip({ projectId, slug, viewing }: { projectId: string; slug: string; viewing: ProjectPhaseValue }) {
  const session = await auth();
  const [project, ticked, autoDoneKeys, member] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { phase: true, abandonedAt: true } }),
    prisma.initiativeChecklistItem.findMany({ where: { projectId, completedAt: { not: null } }, select: { itemKey: true } }),
    getAutoDoneKeys(projectId, slug),
    session?.user?.id ? isRealMember(projectId, session.user.id) : false,
  ]);
  if (!project) return null;
  return (
    <PhaseMenuBar
      slug={slug}
      phase={project.phase}
      completedKeys={ticked.map((c) => c.itemKey)}
      autoDoneKeys={autoDoneKeys}
      canEdit={false}
      viewingPhase={viewing}
      showNextStep={member && !project.abandonedAt}
      compact
    />
  );
}

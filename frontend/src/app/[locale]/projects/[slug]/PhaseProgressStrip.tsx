import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasProjectRole, isRealMember, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { getAutoDoneKeys } from "@/lib/projectSignals";
import type { ProjectPhaseValue } from "@/lib/projectPhase";
import PhaseMenuBar from "./PhaseMenuBar";

// The thin phase bars at the top of each phase overview (/ide, /uppstart,
// …), so progress shows where the work is actually done — not only on the
// project page. Fetches its own data so each overview needs one line.
export default async function PhaseProgressStrip({ projectId, slug, viewing, inHeader = false }: { projectId: string; slug: string; viewing: ProjectPhaseValue; inHeader?: boolean }) {
  const session = await auth();
  const [project, ticked, autoDoneKeys, member, lead] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { phase: true, abandonedAt: true } }),
    prisma.initiativeChecklistItem.findMany({ where: { projectId, completedAt: { not: null } }, select: { itemKey: true } }),
    getAutoDoneKeys(projectId, slug),
    session?.user?.id ? isRealMember(projectId, session.user.id) : false,
    session?.user?.id ? hasProjectRole(projectId, session.user.id, PROJECT_LEAD_ROLES) : false,
  ]);
  if (!project) return null;
  // PROTOTYPE: in the header (wide screens) without "Nästa steg"; the in-page
  // copy is then only for narrow screens, where the header shows the tabs.
  const bar = (
    <PhaseMenuBar
      slug={slug}
      phase={project.phase}
      completedKeys={ticked.map((c) => c.itemKey)}
      autoDoneKeys={autoDoneKeys}
      // In the header the phases open their task list, which leads may tick.
      canEdit={inHeader && lead}
      showOverviews={inHeader}
      viewingPhase={viewing}
      showNextStep={!inHeader && member && !project.abandonedAt}
      compact={!inHeader}
      variant={inHeader ? "header" : "bars"}
    />
  );
  return inHeader ? <div className="w-full">{bar}</div> : <div className="lg:hidden">{bar}</div>;
}

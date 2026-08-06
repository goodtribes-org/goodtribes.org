import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasProjectRole, PROJECT_LEAD_ROLES, isRealMember } from "@/lib/authz";
import { getSprintForProject, getPhaseData, getVotingBoard, getVoterRemainingVotes, PHASE_ORDER } from "@/lib/sprints";
import SprintWorkspace from "./SprintWorkspace";

export default async function SprintPage({
  params,
}: {
  params: Promise<{ slug: string; sprintId: string }>;
}) {
  const { slug, sprintId } = await params;
  const [session, project] = await Promise.all([
    auth(),
    prisma.project.findUnique({ where: { slug }, select: { id: true } }),
  ]);
  if (!project) notFound();

  const sprint = await getSprintForProject(slug, sprintId);
  if (!sprint) notFound();

  const userId = session?.user?.id ?? null;
  const [isLead, isMember] = await Promise.all([
    userId ? hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES) : Promise.resolve(false),
    userId ? isRealMember(project.id, userId) : Promise.resolve(false),
  ]);

  const byName = new Map(sprint.phases.map((p) => [p.phase, p]));
  const phases = PHASE_ORDER.map((name) => {
    const row = byName.get(name);
    return row
      ? {
          id: row.id,
          phase: row.phase,
          status: row.status,
          openedAt: row.openedAt?.toISOString() ?? null,
          deadlineAt: row.deadlineAt?.toISOString() ?? null,
          closedAt: row.closedAt?.toISOString() ?? null,
        }
      : { id: null, phase: name, status: "LOCKED" as const, openedAt: null, deadlineAt: null, closedAt: null };
  });

  const phaseData: Record<string, Awaited<ReturnType<typeof getPhaseData>>> = {};
  for (const row of sprint.phases) {
    if (row.phase !== "DECIDE") {
      phaseData[row.phase] = await getPhaseData(row.id);
    }
  }

  const votingBoard = await getVotingBoard(sprint.id);
  const remainingVotes = userId && votingBoard ? await getVoterRemainingVotes(votingBoard.decidePhaseId, userId) : 0;

  return (
    <SprintWorkspace
      projectSlug={slug}
      sprint={{ id: sprint.id, name: sprint.name, status: sprint.status, pace: sprint.pace, currentPhase: sprint.currentPhase }}
      phases={phases}
      phaseData={phaseData}
      votingBoard={votingBoard}
      remainingVotes={remainingVotes}
      isLead={isLead}
      isMember={isMember}
    />
  );
}

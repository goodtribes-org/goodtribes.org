import { prisma } from "@/lib/prisma";
import { isRealMember } from "@/lib/authz";
import { createNotification } from "@/lib/notify";
import { generatePhaseSummary } from "@/lib/sprintSummary";
import type { SprintPhaseName } from "@prisma/client";

// Declaration order doubles as step order — Postgres native enums compare
// by declaration order, so `orderBy: { phase: "asc" }` on SprintPhase
// naturally yields this same sequence.
export const PHASE_ORDER: SprintPhaseName[] = ["UNDERSTAND", "DIVERGE", "DECIDE", "PROTOTYPE", "VALIDATE"];

export const DEFAULT_PHASE_DAYS = 3;

export function getNextPhase(current: SprintPhaseName): SprintPhaseName | null {
  const idx = PHASE_ORDER.indexOf(current);
  return idx >= 0 && idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : null;
}

// Contributions submitted during Understand/Diverge are anonymous by
// design (see SprintContribution.visibleAuthor) — this is the single
// source of truth for that rule, computed server-side at submission time,
// never trusted from client input.
export function isAnonymousPhase(phase: SprintPhaseName): boolean {
  return phase === "UNDERSTAND" || phase === "DIVERGE";
}

export async function getSprintForProject(projectSlug: string, sprintId: string) {
  return prisma.sprint.findFirst({
    where: { id: sprintId, projectSlug },
    include: { phases: { orderBy: { phase: "asc" } } },
  });
}

export async function listSprintsForProject(projectSlug: string) {
  return prisma.sprint.findMany({
    where: { projectSlug },
    orderBy: { createdAt: "desc" },
  });
}

// Phase + its own contributions, with the author stripped out server-side
// whenever visibleAuthor is false — the field is simply absent from the
// returned shape, never sent to the client to hide there. Aggregate vote
// counts only, never voter identity. Used for Understand/Diverge (own
// contributions + canvas) and Prototype/Validate (own contributions, no
// canvas) — NOT for Decide, which votes on Diverge's contributions instead
// (see getVotingBoard).
type CommentNode = {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string;
  parentId: string | null;
  replies: CommentNode[];
};

function buildCommentTree(
  flat: { id: string; body: string; authorName: string | null; createdAt: Date; parentId: string | null }[]
): CommentNode[] {
  const nodes = new Map<string, CommentNode>(
    flat.map((c) => [c.id, { id: c.id, body: c.body, authorName: c.authorName, createdAt: c.createdAt.toISOString(), parentId: c.parentId, replies: [] }])
  );
  const roots: CommentNode[] = [];
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export async function getPhaseData(sprintPhaseId: string) {
  const phase = await prisma.sprintPhase.findUnique({
    where: { id: sprintPhaseId },
    include: {
      contributions: {
        include: {
          author: { select: { name: true } },
          votes: true,
          comments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!phase) return null;

  const contributions = phase.contributions.map((c) => ({
    id: c.id,
    type: c.type,
    content: c.content,
    createdAt: c.createdAt,
    visibleAuthor: c.visibleAuthor,
    authorName: c.visibleAuthor ? c.author.name : null,
    voteCount: c.votes.length,
    comments: buildCommentTree(
      c.comments.map((cm) => ({ id: cm.id, body: cm.body, authorName: cm.author.name, createdAt: cm.createdAt, parentId: cm.parentId }))
    ),
  }));

  return {
    id: phase.id,
    sprintId: phase.sprintId,
    phase: phase.phase,
    status: phase.status,
    openedAt: phase.openedAt,
    deadlineAt: phase.deadlineAt,
    closedAt: phase.closedAt,
    documentState: phase.documentState,
    version: phase.version,
    aiSummary: phase.aiSummary,
    contributions,
  };
}

export async function canWriteToPhase(sprintPhaseId: string, userId: string): Promise<boolean> {
  const phase = await prisma.sprintPhase.findUnique({
    where: { id: sprintPhaseId },
    select: { status: true, sprint: { select: { project: { select: { id: true } } } } },
  });
  if (!phase || phase.status !== "OPEN") return false;
  return isRealMember(phase.sprint.project.id, userId);
}

// Besluta (Decide) dot-votes go against Skissa's (Diverge) contributions —
// SprintVote.sprintPhaseId is the Decide phase (which phase the 3-vote cap
// applies to), SprintVote.contributionId points at a Diverge-phase row.
export async function getVotingBoard(sprintId: string) {
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId }, include: { phases: true } });
  if (!sprint) return null;
  const divergePhase = sprint.phases.find((p) => p.phase === "DIVERGE");
  const decidePhase = sprint.phases.find((p) => p.phase === "DECIDE");
  if (!divergePhase || !decidePhase) return null;

  const contributions = await prisma.sprintContribution.findMany({
    where: { sprintPhaseId: divergePhase.id },
    include: { votes: { where: { sprintPhaseId: decidePhase.id } } },
    orderBy: { createdAt: "asc" },
  });

  return {
    decidePhaseId: decidePhase.id,
    decidePhaseStatus: decidePhase.status,
    contributions: contributions.map((c) => ({
      id: c.id,
      type: c.type,
      content: c.content,
      voteCount: c.votes.length,
    })),
  };
}

export async function getVoterRemainingVotes(decidePhaseId: string, voterId: string): Promise<number> {
  const used = await prisma.sprintVote.count({ where: { sprintPhaseId: decidePhaseId, voterId } });
  return Math.max(0, 3 - used);
}

// Shared close-current/open-next logic — called both by the deadline cron
// (SPREAD_OUT sprints) and the lead-triggered advancePhase action
// (TOGETHER sprints, or a lead pushing a SPREAD_OUT sprint forward early).
// One implementation, two triggers.
export async function closeAndAdvancePhase(sprintPhaseId: string): Promise<void> {
  const phase = await prisma.sprintPhase.findUnique({
    where: { id: sprintPhaseId },
    include: { sprint: true, _count: { select: { contributions: true, votes: true } } },
  });
  if (!phase || phase.status !== "OPEN") return;

  // Decide never gets its own contributions — it's dot-voting on Diverge's
  // contributions instead — so "empty" has to mean no votes cast there,
  // not no contributions, or Decide would always look empty and pause.
  const isEmpty = phase.phase === "DECIDE" ? phase._count.votes === 0 : phase._count.contributions === 0;
  if (isEmpty) {
    await prisma.sprint.update({ where: { id: phase.sprintId }, data: { status: "PAUSED" } });
    await createNotification({
      userId: phase.sprint.createdById,
      type: "sprint_paused",
      title: `Sprinten "${phase.sprint.name}" pausades`,
      body: `Fasen hade inga bidrag vid deadline, så sprinten pausades i stället för att avancera automatiskt.`,
      url: `/projects/${phase.sprint.projectSlug}/sprints/${phase.sprintId}`,
    });
    return;
  }

  const aiSummary = phase.sprint.aiSummaryEnabled ? await generatePhaseSummary(phase.id) : null;

  await prisma.sprintPhase.update({
    where: { id: phase.id },
    data: { status: "CLOSED", closedAt: new Date(), ...(aiSummary ? { aiSummary } : {}) },
  });

  const next = getNextPhase(phase.phase);
  if (!next) {
    await prisma.sprint.update({ where: { id: phase.sprintId }, data: { status: "COMPLETED" } });
    return;
  }

  const deadlineAt =
    phase.sprint.pace === "SPREAD_OUT"
      ? new Date(Date.now() + (phase.sprint.phaseDurationDays ?? DEFAULT_PHASE_DAYS) * 24 * 60 * 60 * 1000)
      : null;

  await prisma.sprintPhase.upsert({
    where: { sprintId_phase: { sprintId: phase.sprintId, phase: next } },
    create: { sprintId: phase.sprintId, phase: next, status: "OPEN", openedAt: new Date(), deadlineAt },
    update: { status: "OPEN", openedAt: new Date(), deadlineAt, closedAt: null },
  });

  await prisma.sprint.update({ where: { id: phase.sprintId }, data: { currentPhase: next } });
}

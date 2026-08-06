"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isRealMember, hasProjectRole, PROJECT_LEAD_ROLES, isSiteAdmin } from "@/lib/authz";
import { canWriteToPhase, isAnonymousPhase } from "@/lib/sprints";
import { publishToSprintCanvas } from "@/lib/redis";
import { Prisma } from "@prisma/client";
import type { SprintContributionType } from "@prisma/client";

type CanvasSaveResult =
  | { ok: true; version: number }
  | { ok: false; conflict: true; latest: { documentState: Prisma.JsonValue; version: number } }
  | { ok: false; conflict: false; error: string };

// Optimistic locking: a stale expectedVersion means someone else's async
// edit landed first — reject and hand back the latest state instead of
// silently overwriting it. No literal HTTP 409 (this is a Server Action,
// not a route handler) — conflict is a typed field on the result instead.
export async function autosaveCanvas(
  projectSlug: string,
  sprintPhaseId: string,
  documentState: Prisma.InputJsonValue,
  expectedVersion: number
): Promise<CanvasSaveResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, conflict: false, error: "Not logged in" };
  if (!(await canWriteToPhase(sprintPhaseId, session.user.id))) {
    return { ok: false, conflict: false, error: "Not authorized" };
  }

  const result = await prisma.sprintPhase.updateMany({
    where: { id: sprintPhaseId, version: expectedVersion, status: "OPEN" },
    data: { documentState, version: { increment: 1 } },
  });

  if (result.count === 0) {
    const latest = await prisma.sprintPhase.findUnique({
      where: { id: sprintPhaseId },
      select: { documentState: true, version: true },
    });
    if (!latest) return { ok: false, conflict: false, error: "Phase not found" };
    return { ok: false, conflict: true, latest };
  }

  revalidatePath(`/projects/${projectSlug}/sprints`);
  return { ok: true, version: expectedVersion + 1 };
}

// Live whiteboard sync — deliberately never touches Postgres (onChange
// fires many times/sec while drawing; the 15s autosaveCanvas above stays
// the actual persistence path). Payload shape (elements/appState diff or a
// pointer position for cursors, tagged with a per-mount clientId so
// senders can ignore their own echo) is opaque here — this is just an
// authorized relay onto the sprint-canvas:<phaseId> Redis channel.
export async function broadcastCanvasChange(sprintPhaseId: string, payload: unknown) {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await canWriteToPhase(sprintPhaseId, session.user.id))) return;

  publishToSprintCanvas(sprintPhaseId, payload);
}

export async function submitContribution(
  projectSlug: string,
  sprintPhaseId: string,
  type: SprintContributionType,
  content: string
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  if (!(await canWriteToPhase(sprintPhaseId, session.user.id))) return { error: "Not authorized" };

  const trimmed = content.trim();
  if (!trimmed) return { error: "Empty content" };

  const phase = await prisma.sprintPhase.findUnique({ where: { id: sprintPhaseId } });
  if (!phase) return { error: "Phase not found" };

  await prisma.sprintContribution.create({
    data: {
      sprintPhaseId,
      authorId: session.user.id,
      type,
      content: trimmed,
      // Server-computed, never client-supplied — anonymity during
      // Understand/Diverge is a platform rule, not a per-submission choice.
      visibleAuthor: !isAnonymousPhase(phase.phase),
    },
  });

  revalidatePath(`/projects/${projectSlug}/sprints`);
  return { success: true };
}

// Dot-voting cap (max 3 per voter per phase) enforced here at the
// application layer; the SprintVote unique constraint is only a backstop
// against double-voting the exact same contribution twice.
export async function castVote(
  projectSlug: string,
  sprintPhaseId: string,
  contributionId: string
): Promise<{ error: string } | { success: true }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  if (!(await canWriteToPhase(sprintPhaseId, session.user.id))) return { error: "Not authorized" };

  const voterId = session.user.id;

  const result = await prisma.$transaction(async (tx) => {
    const existingCount = await tx.sprintVote.count({ where: { sprintPhaseId, voterId } });
    if (existingCount >= 3) return { error: "Vote cap reached (max 3 per phase)" } as const;

    const alreadyVoted = await tx.sprintVote.findUnique({
      where: { sprintPhaseId_voterId_contributionId: { sprintPhaseId, voterId, contributionId } },
    });
    if (alreadyVoted) return { error: "Already voted for this contribution" } as const;

    await tx.sprintVote.create({ data: { sprintPhaseId, voterId, contributionId } });
    return { success: true } as const;
  });

  if ("success" in result) revalidatePath(`/projects/${projectSlug}/sprints`);
  return result;
}

export async function addComment(projectSlug: string, contributionId: string, body: string, parentId?: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const trimmed = body.trim();
  if (!trimmed) return { error: "Empty comment" };

  const contribution = await prisma.sprintContribution.findUnique({
    where: { id: contributionId },
    include: { sprintPhase: { include: { sprint: { include: { project: { select: { id: true } } } } } } },
  });
  if (!contribution) return { error: "Contribution not found" };

  if (!(await isRealMember(contribution.sprintPhase.sprint.project.id, session.user.id))) {
    return { error: "Not authorized" };
  }

  await prisma.sprintComment.create({
    data: { contributionId, authorId: session.user.id, body: trimmed, parentId: parentId ?? null },
  });

  revalidatePath(`/projects/${projectSlug}/sprints`);
  return { success: true };
}

// Hard-deletes a single phase's content — the drawing (documentState) and
// every contribution/vote on it (cascades via SprintContribution's FK) —
// but keeps the SprintPhase row itself (status/dates untouched), since the
// five phases are structural slots in the sprint, not deletable on their
// own. Lead or site-admin only; unlike autosave/broadcast this isn't
// gated by phase status, so content can be cleared even after a phase closes.
export async function deletePhaseContent(projectSlug: string, sprintPhaseId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const phase = await prisma.sprintPhase.findUnique({
    where: { id: sprintPhaseId },
    include: { sprint: { include: { project: { select: { id: true } } } } },
  });
  if (!phase) return { error: "Phase not found" };

  const allowed =
    (await hasProjectRole(phase.sprint.project.id, session.user.id, PROJECT_LEAD_ROLES)) ||
    (await isSiteAdmin(session.user.id));
  if (!allowed) return { error: "Not authorized" };

  await prisma.sprintContribution.deleteMany({ where: { sprintPhaseId } });
  await prisma.sprintPhase.update({
    where: { id: sprintPhaseId },
    data: { documentState: Prisma.JsonNull, version: 1, aiSummary: null },
  });

  revalidatePath(`/projects/${projectSlug}/sprints/${phase.sprintId}`);
  return { success: true };
}

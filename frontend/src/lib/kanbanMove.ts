import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { publishToKanban } from "@/lib/redis";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { getPriorityTokenValue } from "@/lib/priorityTokens";
import { mintCardCompletion, reverseCardTokens } from "@/lib/tokens";
import { createNotification } from "@/lib/notify";

async function updateStreak(userId: string, projectSlug: string) {
  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true },
  });
  if (!project) return;
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const existing = await prisma.userStreak.findUnique({
    where: { userId_projectId: { userId, projectId: project.id } },
  });
  if (!existing) {
    await prisma.userStreak.create({
      data: { userId, projectId: project.id, currentWeeks: 1, longestWeeks: 1, lastActivityAt: now },
    });
  } else {
    const isNewWeek = existing.lastActivityAt < oneWeekAgo;
    const newCurrent = isNewWeek ? existing.currentWeeks + 1 : existing.currentWeeks;
    await prisma.userStreak.update({
      where: { userId_projectId: { userId, projectId: project.id } },
      data: {
        currentWeeks: newCurrent,
        longestWeeks: Math.max(newCurrent, existing.longestWeeks),
        lastActivityAt: now,
      },
    });
  }
}

export type MoveOverrides = {
  // Reassigns which member gets credited for a subtask's completion — from
  // the payout preview dialog, when the wrong person was recorded against
  // it. Keyed by subtask id; null clears the credit for that subtask.
  subtaskCompletedBy?: Record<string, string | null>;
  // Only used as a payout override when the card has no subtasks (or none
  // credited to anyone) — the assignee-fallback case in computeCardPayees.
  assigneeId?: string | null;
};

export async function moveKanbanCard(cardId: string, newColumn: string, userId: string, overrides?: MoveOverrides) {
  const card = await prisma.kanbanCard.findUnique({ where: { id: cardId } });
  if (!card) return { error: "Card not found" };

  const project = await prisma.project.findUnique({
    where: { slug: card.projectSlug },
    select: { id: true },
  });

  const subtasks = await prisma.kanbanCardSubtask.findMany({
    where: { cardId: card.id },
    orderBy: { order: "asc" },
    select: { id: true, title: true, done: true, completedById: true },
  });

  // A card with subtasks can't reach Review or Done until every subtask is
  // checked off — that's the only signal we have for "who actually did this".
  if ((newColumn === "REVIEW" || newColumn === "DONE") && subtasks.some((s) => !s.done)) {
    return { error: "Alla deluppgifter måste vara klara innan kortet kan flyttas dit" };
  }

  // Regular members can't move cards straight to Done — they land in Review for a lead to approve.
  let targetColumn = newColumn;
  if (newColumn === "DONE" && project && !(await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES))) {
    targetColumn = "REVIEW";
  }

  const maxOrder = await prisma.kanbanCard.aggregate({
    where: { projectSlug: card.projectSlug, column: targetColumn, NOT: { id: cardId } },
    _max: { order: true },
  });

  // Priority locks the first time a card enters "Doing" — from then on its token
  // value is frozen, so later priority edits can't retroactively change payout.
  // Locks the first time a card reaches "Doing" — or "Done" directly, for
  // cards whose subtasks were all finished before ever passing through Doing.
  const shouldLockPriority = (targetColumn === "DOING" || targetColumn === "DONE") && !card.priorityLockedAt;
  const tokenValue = card.lockedTokenValue ?? getPriorityTokenValue(card.priority);

  const updated = await prisma.kanbanCard.update({
    where: { id: cardId },
    data: {
      column: targetColumn,
      order: (maxOrder._max.order ?? -1) + 1,
      ...(shouldLockPriority ? { priorityLockedAt: new Date(), lockedTokenValue: tokenValue } : {}),
    },
  });

  await updateStreak(userId, card.projectSlug);

  // Tokens mint the moment a card actually lands in Done — a lead moving it
  // there (directly, or approving it out of Review) is the approval act.
  if (targetColumn === "DONE" && card.column !== "DONE") {
    const payees = await prisma.$transaction(async (tx) => {
      const alreadyPaid = await tx.tokenLedger.count({ where: { kanbanCardId: card.id } });
      if (alreadyPaid > 0) return [];

      // Apply any reassignments made in the payout preview dialog — persisted
      // for real (not just this one payout) so the subtask/card keep showing
      // the corrected credit afterwards.
      let payoutSubtasks = subtasks;
      let payoutAssigneeId = card.assigneeId;

      if (overrides?.subtaskCompletedBy) {
        const reassignments = Object.entries(overrides.subtaskCompletedBy);
        for (const [subtaskId, completedById] of reassignments) {
          await tx.kanbanCardSubtask.update({ where: { id: subtaskId }, data: { completedById } });
        }
        const bySubtaskId = new Map(reassignments);
        payoutSubtasks = subtasks.map((s) => (bySubtaskId.has(s.id) ? { ...s, completedById: bySubtaskId.get(s.id)! } : s));
      }

      if (overrides?.assigneeId !== undefined && !payoutSubtasks.some((s) => s.completedById)) {
        payoutAssigneeId = overrides.assigneeId;
        if (overrides.assigneeId !== card.assigneeId) {
          await tx.kanbanCard.update({ where: { id: card.id }, data: { assigneeId: overrides.assigneeId } });
        }
      }

      return mintCardCompletion(tx, {
        card: { id: card.id, projectSlug: card.projectSlug, title: card.title, priority: card.priority, createdById: card.createdById },
        tokenValue,
        subtasks: payoutSubtasks,
        assigneeId: payoutAssigneeId,
        approverId: userId,
      });
    });
    for (const payee of payees) {
      await createNotification({
        userId: payee.userId,
        type: "card_tokens_awarded",
        title: `You were awarded tokens for "${card.title}"`,
        url: `/projects/${card.projectSlug}/tokens`,
      });
    }
  }

  // Moving a card back out of Done means its completion no longer stands —
  // any tokens it paid out are reversed so re-completing it later mints a
  // fresh payout instead of leaving the original one to stand unearned.
  if (card.column === "DONE" && targetColumn !== "DONE") {
    const revokedUserIds = await prisma.$transaction((tx) => reverseCardTokens(tx, card.id));
    for (const revokedUserId of revokedUserIds) {
      await createNotification({
        userId: revokedUserId,
        type: "card_tokens_revoked",
        title: `Tokens for "${card.title}" were removed after the card left Done`,
        url: `/projects/${card.projectSlug}/tokens`,
      });
    }
  }

  if (targetColumn !== card.column) {
    if (project) {
      if (targetColumn === "DONE") {
        await logActivity(project.id, userId, "task_completed", { title: card.title, cardId: card.id, description: card.description, subtasks });
      } else {
        await logActivity(project.id, userId, "task_moved", { title: card.title, cardId: card.id, fromColumn: card.column, toColumn: targetColumn });
      }
    }
  }

  publishToKanban(card.projectSlug, { action: "moved", card: updated });

  revalidatePath(`/projects/${card.projectSlug}/kanban`);
  revalidatePath(`/projects/${card.projectSlug}/tasks`);
  revalidatePath(`/projects/${card.projectSlug}/tokens`);

  return { ok: true, card: updated };
}

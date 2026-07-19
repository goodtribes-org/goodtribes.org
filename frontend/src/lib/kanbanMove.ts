import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { publishToKanban } from "@/lib/redis";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { getPriorityTokenValue } from "@/lib/priorityTokens";
import { mintCardCompletion } from "@/lib/tokens";
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

export async function moveKanbanCard(cardId: string, newColumn: string, userId: string) {
  const card = await prisma.kanbanCard.findUnique({ where: { id: cardId } });
  if (!card) return { error: "Card not found" };

  const project = await prisma.project.findUnique({
    where: { slug: card.projectSlug },
    select: { id: true },
  });

  const subtasks = await prisma.kanbanCardSubtask.findMany({
    where: { cardId: card.id },
    orderBy: { order: "asc" },
    select: { title: true, done: true, completedById: true },
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
      return mintCardCompletion(tx, {
        card: { id: card.id, projectSlug: card.projectSlug, title: card.title, priority: card.priority, createdById: card.createdById },
        tokenValue,
        subtasks,
        assigneeId: card.assigneeId,
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

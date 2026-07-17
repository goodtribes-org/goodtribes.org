import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { publishToKanban } from "@/lib/redis";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";

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

  // Regular members can't move cards straight to Done — they land in Review for a lead to approve.
  let targetColumn = newColumn;
  if (newColumn === "DONE" && project && !(await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES))) {
    targetColumn = "REVIEW";
  }

  const maxOrder = await prisma.kanbanCard.aggregate({
    where: { projectSlug: card.projectSlug, column: targetColumn, NOT: { id: cardId } },
    _max: { order: true },
  });

  const updated = await prisma.kanbanCard.update({
    where: { id: cardId },
    data: { column: targetColumn, order: (maxOrder._max.order ?? -1) + 1 },
  });

  await updateStreak(userId, card.projectSlug);

  if (targetColumn !== card.column) {
    if (project) {
      if (targetColumn === "DONE") {
        const subtasks = await prisma.kanbanCardSubtask.findMany({
          where: { cardId: card.id }, orderBy: { order: "asc" }, select: { title: true, done: true },
        });
        await logActivity(project.id, userId, "task_completed", { title: card.title, cardId: card.id, description: card.description, subtasks });
      } else {
        await logActivity(project.id, userId, "task_moved", { title: card.title, cardId: card.id, fromColumn: card.column, toColumn: targetColumn });
      }
    }
  }

  publishToKanban(card.projectSlug, { action: "moved", card: updated });

  revalidatePath(`/projects/${card.projectSlug}/kanban`);
  revalidatePath(`/projects/${card.projectSlug}/tasks`);

  return { ok: true, card: updated };
}

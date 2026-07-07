"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { estimateTask } from "@/lib/taskEstimate";
import { logActivity } from "@/lib/activity";


export async function createCard(
  projectSlug: string,
  title: string,
  column: string,
  description?: string,
  dueDate?: string,
  priority?: string,
  assigneeId?: string,
  startDate?: string,
  subtasks?: string[],
  category?: string,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const maxOrder = await prisma.kanbanCard.aggregate({
    where: { projectSlug, column },
    _max: { order: true },
  });

  const card = await prisma.kanbanCard.create({
    data: {
      projectSlug,
      title: title.trim(),
      column,
      order: (maxOrder._max.order ?? -1) + 1,
      createdById: session.user.id,
      description: description?.trim() || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      startDate: startDate ? new Date(startDate) : null,
      priority: priority || "normal",
      category: category || null,
      assigneeId: assigneeId || null,
    },
  });

  if (subtasks && subtasks.length > 0) {
    await prisma.kanbanCardSubtask.createMany({
      data: subtasks.filter((t) => t.trim()).map((t, i) => ({
        cardId: card.id,
        title: t.trim(),
        order: i,
      })),
    });
  }

  const est = await estimateTask(card.title, card.description);
  if (est) {
    await prisma.taskEstimate.create({
      data: {
        kanbanCardId: card.id,
        aiHours: est.hours,
        aiConfidence: est.confidence,
        aiReasoning: est.reasoning,
      },
    });
  }

  revalidatePath(`/projects/${projectSlug}/kanban`);
  revalidatePath(`/projects/${projectSlug}/tasks`);
  return { cardId: card.id };
}

export async function promoteSubtaskToCard(subtaskId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const subtask = await prisma.kanbanCardSubtask.findUnique({
    where: { id: subtaskId },
    include: { card: true },
  });
  if (!subtask) return { error: "Subtask not found" };

  const maxOrder = await prisma.kanbanCard.aggregate({
    where: { projectSlug: subtask.card.projectSlug, column: subtask.card.column },
    _max: { order: true },
  });

  const newCard = await prisma.kanbanCard.create({
    data: {
      projectSlug: subtask.card.projectSlug,
      title: subtask.title,
      column: subtask.card.column,
      order: (maxOrder._max.order ?? -1) + 1,
      createdById: session.user.id,
      priority: subtask.card.priority,
      category: subtask.card.category,
    },
  });

  await prisma.kanbanCardSubtask.delete({ where: { id: subtaskId } });

  revalidatePath(`/projects/${subtask.card.projectSlug}/kanban`);
  revalidatePath(`/projects/${subtask.card.projectSlug}/tasks`);
  return { card: newCard };
}

export async function deleteSubtask(subtaskId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const subtask = await prisma.kanbanCardSubtask.findUnique({
    where: { id: subtaskId },
    include: { card: { select: { projectSlug: true } } },
  });
  if (!subtask) return { error: "Subtask not found" };

  await prisma.kanbanCardSubtask.delete({ where: { id: subtaskId } });
  revalidatePath(`/projects/${subtask.card.projectSlug}/kanban`);
  return { ok: true };
}

export async function updateSubtaskTitle(subtaskId: string, title: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const subtask = await prisma.kanbanCardSubtask.findUnique({
    where: { id: subtaskId },
    include: { card: { select: { projectSlug: true } } },
  });
  if (!subtask) return { error: "Subtask not found" };

  await prisma.kanbanCardSubtask.update({
    where: { id: subtaskId },
    data: { title: title.trim() },
  });
  revalidatePath(`/projects/${subtask.card.projectSlug}/kanban`);
  return { ok: true };
}

export async function addSubtask(cardId: string, title: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const card = await prisma.kanbanCard.findUnique({
    where: { id: cardId },
    select: { projectSlug: true },
  });
  if (!card) return { error: "Card not found" };

  const maxOrder = await prisma.kanbanCardSubtask.aggregate({
    where: { cardId },
    _max: { order: true },
  });

  const subtask = await prisma.kanbanCardSubtask.create({
    data: { cardId, title: title.trim(), order: (maxOrder._max.order ?? -1) + 1 },
  });

  revalidatePath(`/projects/${card.projectSlug}/kanban`);
  revalidatePath(`/projects/${card.projectSlug}/tasks`);
  return { subtask };
}

export async function addComment(cardId: string, body: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const card = await prisma.kanbanCard.findUnique({
    where: { id: cardId },
    select: { projectSlug: true },
  });
  if (!card) return { error: "Card not found" };

  const comment = await prisma.kanbanCardComment.create({
    data: { cardId, authorId: session.user.id, body },
    include: { author: { select: { id: true, name: true } } },
  });

  revalidatePath(`/projects/${card.projectSlug}/kanban`);
  revalidatePath(`/projects/${card.projectSlug}/tasks`);
  return { comment };
}

export async function deleteComment(commentId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const comment = await prisma.kanbanCardComment.findUnique({
    where: { id: commentId },
    include: { card: { select: { projectSlug: true } } },
  });
  if (!comment) return { error: "Comment not found" };
  if (comment.authorId !== session.user.id) return { error: "Not authorized" };

  await prisma.kanbanCardComment.delete({ where: { id: commentId } });
  revalidatePath(`/projects/${comment.card.projectSlug}/kanban`);
  revalidatePath(`/projects/${comment.card.projectSlug}/tasks`);
}

export async function toggleSubtask(subtaskId: string, done: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const subtask = await prisma.kanbanCardSubtask.findUnique({
    where: { id: subtaskId },
    include: { card: { select: { projectSlug: true } } },
  });
  if (!subtask) return { error: "Subtask not found" };

  await prisma.kanbanCardSubtask.update({
    where: { id: subtaskId },
    data: { done },
  });

  revalidatePath(`/projects/${subtask.card.projectSlug}/kanban`);
  revalidatePath(`/projects/${subtask.card.projectSlug}/tasks`);
}

export async function updateCard(
  cardId: string,
  data: { title?: string; description?: string | null; dueDate?: string | null; startDate?: string | null; priority?: string; assigneeId?: string | null; category?: string | null },
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const card = await prisma.kanbanCard.findUnique({ where: { id: cardId } });
  if (!card) return { error: "Card not found" };

  await prisma.kanbanCard.update({
    where: { id: cardId },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
      ...(data.startDate !== undefined ? { startDate: data.startDate ? new Date(data.startDate) : null } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.category !== undefined ? { category: data.category || null } : {}),
      ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId || null } : {}),
    },
  });

  revalidatePath(`/projects/${card.projectSlug}/kanban`);
  revalidatePath(`/projects/${card.projectSlug}/calendar`);
}

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

export async function moveCard(cardId: string, newColumn: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const card = await prisma.kanbanCard.findUnique({ where: { id: cardId } });
  if (!card) return { error: "Card not found" };

  const maxOrder = await prisma.kanbanCard.aggregate({
    where: { projectSlug: card.projectSlug, column: newColumn, NOT: { id: cardId } },
    _max: { order: true },
  });

  await prisma.kanbanCard.update({
    where: { id: cardId },
    data: { column: newColumn, order: (maxOrder._max.order ?? -1) + 1 },
  });

  await updateStreak(session.user.id, card.projectSlug);

  if (newColumn === "DONE") {
    const project = await prisma.project.findUnique({ where: { slug: card.projectSlug }, select: { id: true } });
    if (project) await logActivity(project.id, session.user.id, "task_completed", { title: card.title, cardId: card.id });
  }

  revalidatePath(`/projects/${card.projectSlug}/kanban`);
  revalidatePath(`/projects/${card.projectSlug}/tasks`);
}

export async function deleteCard(cardId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const card = await prisma.kanbanCard.findUnique({ where: { id: cardId } });
  if (!card) return { error: "Card not found" };
  if (card.createdById !== session.user.id) return { error: "Not authorized" };

  await prisma.kanbanCard.delete({ where: { id: cardId } });
  revalidatePath(`/projects/${card.projectSlug}/kanban`);
  revalidatePath(`/projects/${card.projectSlug}/tasks`);
}

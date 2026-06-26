"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { estimateTask } from "@/lib/taskEstimate";


export async function createCard(
  projectSlug: string,
  title: string,
  column: string,
  description?: string,
  dueDate?: string,
  priority?: string,
  assigneeId?: string,
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
      priority: priority || "normal",
      assigneeId: assigneeId || null,
    },
  });

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
}

export async function updateCard(
  cardId: string,
  data: { title?: string; description?: string | null; dueDate?: string | null; priority?: string; assigneeId?: string | null },
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
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId || null } : {}),
    },
  });

  revalidatePath(`/projects/${card.projectSlug}/kanban`);
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

  revalidatePath(`/projects/${card.projectSlug}/kanban`);
}

export async function deleteCard(cardId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const card = await prisma.kanbanCard.findUnique({ where: { id: cardId } });
  if (!card) return { error: "Card not found" };
  if (card.createdById !== session.user.id) return { error: "Not authorized" };

  await prisma.kanbanCard.delete({ where: { id: cardId } });
  revalidatePath(`/projects/${card.projectSlug}/kanban`);
}

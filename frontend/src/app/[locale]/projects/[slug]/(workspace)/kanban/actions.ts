"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { estimateTask } from "@/lib/taskEstimate";
import { logActivity } from "@/lib/activity";
import { isRealMember, hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { publishToKanban } from "@/lib/redis";
import { moveKanbanCard } from "@/lib/kanbanMove";

async function isProjectLead(projectSlug: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return false;
  return hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES);
}

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

  const cleanedSubtasks = subtasks?.map((t) => t.trim()).filter(Boolean) ?? [];
  if (cleanedSubtasks.length > 0) {
    await prisma.kanbanCardSubtask.createMany({
      data: cleanedSubtasks.map((t, i) => ({
        cardId: card.id,
        title: t,
        order: i,
      })),
    });
  }

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (project) await logActivity(project.id, session.user.id, "task_created", {
    title: card.title, cardId: card.id, description: card.description,
    subtasks: cleanedSubtasks.map((title) => ({ title, done: false })),
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

  publishToKanban(projectSlug, { action: "created", card });

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
    include: { card: { select: { projectSlug: true, createdById: true } } },
  });
  if (!subtask) return { error: "Subtask not found" };
  if (subtask.card.createdById !== session.user.id && !(await isProjectLead(subtask.card.projectSlug, session.user.id))) {
    return { error: "Not authorized" };
  }

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
    select: { projectSlug: true, project: { select: { id: true } } },
  });
  if (!card) return { error: "Card not found" };

  const member = await isRealMember(card.project.id, session.user.id);
  if (!member) return { error: "Not a project member" };

  const comment = await prisma.kanbanCardComment.create({
    data: { cardId, authorId: session.user.id, body },
    include: { author: { select: { id: true, name: true } } },
  });

  revalidatePath(`/projects/${card.projectSlug}/kanban`);
  revalidatePath(`/projects/${card.projectSlug}/tasks`);
  revalidatePath("/");
  revalidatePath("/feed");
  return { comment };
}

export async function toggleCardCommentLike(commentId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const comment = await prisma.kanbanCardComment.findUnique({
    where: { id: commentId },
    select: { card: { select: { projectSlug: true, project: { select: { id: true } } } } },
  });
  if (!comment) return { error: "Comment not found" };

  const member = await isRealMember(comment.card.project.id, session.user.id);
  if (!member) return { error: "Not a project member" };

  const existing = await prisma.feedLike.findUnique({
    where: {
      userId_targetType_targetId: {
        userId: session.user.id,
        targetType: "kanbanCardComment",
        targetId: commentId,
      },
    },
  });

  if (existing) {
    await prisma.feedLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.feedLike.create({
      data: { userId: session.user.id, targetType: "kanbanCardComment", targetId: commentId },
    });
  }

  revalidatePath(`/projects/${comment.card.projectSlug}/kanban`);
  revalidatePath(`/projects/${comment.card.projectSlug}/tasks`);
  revalidatePath("/");
  revalidatePath("/feed");
  return { ok: true };
}

export async function toggleCardLike(cardId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const card = await prisma.kanbanCard.findUnique({
    where: { id: cardId },
    select: { projectSlug: true, project: { select: { id: true } } },
  });
  if (!card) return { error: "Card not found" };

  const member = await isRealMember(card.project.id, session.user.id);
  if (!member) return { error: "Not a project member" };

  const existing = await prisma.feedLike.findUnique({
    where: {
      userId_targetType_targetId: {
        userId: session.user.id,
        targetType: "kanbanCard",
        targetId: cardId,
      },
    },
  });

  if (existing) {
    await prisma.feedLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.feedLike.create({
      data: { userId: session.user.id, targetType: "kanbanCard", targetId: cardId },
    });
  }

  revalidatePath(`/projects/${card.projectSlug}/kanban`);
  revalidatePath(`/projects/${card.projectSlug}/tasks`);
  return { ok: true };
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
  revalidatePath("/");
  revalidatePath("/feed");
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

  const updated = await prisma.kanbanCard.update({
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

  publishToKanban(card.projectSlug, { action: "updated", card: updated });

  revalidatePath(`/projects/${card.projectSlug}/kanban`);
  revalidatePath(`/projects/${card.projectSlug}/calendar`);
}

export async function moveCard(cardId: string, newColumn: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  return moveKanbanCard(cardId, newColumn, session.user.id);
}

export async function deleteCard(cardId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const card = await prisma.kanbanCard.findUnique({ where: { id: cardId } });
  if (!card) return { error: "Card not found" };
  if (card.createdById !== session.user.id && !(await isProjectLead(card.projectSlug, session.user.id))) {
    return { error: "Not authorized" };
  }

  await prisma.kanbanCard.delete({ where: { id: cardId } });
  publishToKanban(card.projectSlug, { action: "deleted", cardId });
  revalidatePath(`/projects/${card.projectSlug}/kanban`);
  revalidatePath(`/projects/${card.projectSlug}/tasks`);
}

export async function clearColumnCards(projectSlug: string, column: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return { error: "Project not found" };

  const isLead = await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES);
  if (!isLead) return { error: "Must be a project admin or founder" };

  await prisma.kanbanCard.deleteMany({ where: { projectSlug, column } });

  publishToKanban(projectSlug, { action: "column-cleared", column });
  revalidatePath(`/projects/${projectSlug}/kanban`);
  revalidatePath(`/projects/${projectSlug}/tasks`);
  return { ok: true };
}

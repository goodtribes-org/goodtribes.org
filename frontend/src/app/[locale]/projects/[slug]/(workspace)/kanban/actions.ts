"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { estimateTask } from "@/lib/taskEstimate";
import { logActivity } from "@/lib/activity";
import { isRealMember, isCardClaimant, hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { createNotification } from "@/lib/notify";
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

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  const canSetPriority = project ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES) : false;

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
      priority: canSetPriority ? (priority || "normal") : "normal",
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
    select: { projectSlug: true, assigneeId: true, openToPublic: true, project: { select: { id: true } } },
  });
  if (!card) return { error: "Card not found" };

  const allowed = (await isRealMember(card.project.id, session.user.id)) || isCardClaimant(card, session.user.id);
  if (!allowed) return { error: "Not a project member" };

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
    select: { card: { select: { projectSlug: true, assigneeId: true, openToPublic: true, project: { select: { id: true } } } } },
  });
  if (!comment) return { error: "Comment not found" };

  const allowed = (await isRealMember(comment.card.project.id, session.user.id)) || isCardClaimant(comment.card, session.user.id);
  if (!allowed) return { error: "Not a project member" };

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
    select: { projectSlug: true, assigneeId: true, openToPublic: true, project: { select: { id: true } } },
  });
  if (!card) return { error: "Card not found" };

  const allowed = (await isRealMember(card.project.id, session.user.id)) || isCardClaimant(card, session.user.id);
  if (!allowed) return { error: "Not a project member" };

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
  const userId = session.user.id;

  const card = await prisma.kanbanCard.findUnique({ where: { id: cardId } });
  if (!card) return { error: "Card not found" };

  const priorityChanging = data.priority !== undefined && data.priority !== card.priority;
  if (priorityChanging) {
    if (card.priorityLockedAt) return { error: "Priority is locked once work has started on this card" };
    if (!(await isProjectLead(card.projectSlug, userId))) {
      return { error: "Only project founders/admins can set priority" };
    }
  }

  let assigneeIsMember = false;
  if (data.assigneeId !== undefined) {
    const project = await prisma.project.findUnique({ where: { slug: card.projectSlug }, select: { id: true } });
    assigneeIsMember = project ? await isRealMember(project.id, userId) : false;
    const isFreshSelfClaim = card.openToPublic && card.assigneeId === null && data.assigneeId === userId;
    const isSelfUnclaim = card.openToPublic && card.assigneeId === userId && !data.assigneeId;
    if (!assigneeIsMember && !isFreshSelfClaim && !isSelfUnclaim) {
      return { error: "Not authorized to change the assignee" };
    }
  }

  const updated = await prisma.kanbanCard.update({
    where: { id: cardId },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
      ...(data.startDate !== undefined ? { startDate: data.startDate ? new Date(data.startDate) : null } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.category !== undefined ? { category: data.category || null } : {}),
      ...(data.assigneeId !== undefined
        ? {
            assigneeId: data.assigneeId || null,
            ...(data.assigneeId && !assigneeIsMember ? { claimedAt: new Date() } : { claimedAt: null }),
          }
        : {}),
    },
  });

  if (priorityChanging) {
    await prisma.kanbanCardPriorityChange.create({
      data: { kanbanCardId: cardId, changedById: userId, fromPriority: card.priority, toPriority: data.priority! },
    });
  }

  publishToKanban(card.projectSlug, { action: "updated", card: updated });

  revalidatePath(`/projects/${card.projectSlug}/kanban`);
  revalidatePath(`/projects/${card.projectSlug}/calendar`);
}

export async function claimCard(cardId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const userId = session.user.id;

  const card = await prisma.kanbanCard.findUnique({
    where: { id: cardId },
    select: {
      id: true, projectSlug: true, title: true, openToPublic: true, assigneeId: true, column: true,
      project: { select: { id: true, members: { where: { role: { in: PROJECT_LEAD_ROLES } }, select: { userId: true } } } },
    },
  });
  if (!card) return { error: "Card not found" };
  if (!card.openToPublic) return { error: "This task is not open for public claiming" };
  if (card.column === "DONE") return { error: "This task is already done" };
  if (await isRealMember(card.project.id, userId)) return { error: "Members should assign themselves via the card editor" };

  const result = await prisma.kanbanCard.updateMany({
    where: { id: cardId, assigneeId: null, openToPublic: true },
    data: { assigneeId: userId, claimedAt: new Date() },
  });
  if (result.count === 0) return { error: "Someone already claimed this task" };

  const updated = await prisma.kanbanCard.findUnique({ where: { id: cardId } });
  publishToKanban(card.projectSlug, { action: "updated", card: updated });
  await logActivity(card.project.id, userId, "task_claimed", { title: card.title, cardId: card.id });

  await Promise.all(
    card.project.members.map((m) =>
      createNotification({
        userId: m.userId,
        type: "task_claimed",
        title: `Someone claimed the open task "${card.title}"`,
        url: `/projects/${card.projectSlug}/tasks?card=${card.id}`,
      })
    )
  );

  revalidatePath(`/projects/${card.projectSlug}/kanban`);
  revalidatePath(`/projects/${card.projectSlug}/tasks`);
  return { ok: true, card: updated };
}

export async function abandonCard(cardId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const userId = session.user.id;

  const card = await prisma.kanbanCard.findUnique({
    where: { id: cardId },
    select: { id: true, projectSlug: true },
  });
  if (!card) return { error: "Card not found" };

  const result = await prisma.kanbanCard.updateMany({
    where: { id: cardId, assigneeId: userId, openToPublic: true },
    data: { assigneeId: null, claimedAt: null },
  });
  if (result.count === 0) return { error: "Not your claimed task" };

  const updated = await prisma.kanbanCard.findUnique({ where: { id: cardId } });
  publishToKanban(card.projectSlug, { action: "updated", card: updated });
  revalidatePath(`/projects/${card.projectSlug}/kanban`);
  revalidatePath(`/projects/${card.projectSlug}/tasks`);
  return { ok: true, card: updated };
}

export async function setCardOpenToPublic(cardId: string, open: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const card = await prisma.kanbanCard.findUnique({ where: { id: cardId }, select: { projectSlug: true } });
  if (!card) return { error: "Card not found" };
  if (!(await isProjectLead(card.projectSlug, session.user.id))) return { error: "Not authorized" };

  const updated = await prisma.kanbanCard.update({
    where: { id: cardId },
    data: { openToPublic: open },
  });

  publishToKanban(card.projectSlug, { action: "updated", card: updated });
  revalidatePath(`/projects/${card.projectSlug}/kanban`);
  revalidatePath(`/projects/${card.projectSlug}/tasks`);
  return { ok: true, card: updated };
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

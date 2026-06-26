"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";


export async function createList(projectSlug: string, name: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const max = await prisma.todoList.aggregate({
    where: { projectSlug },
    _max: { order: true },
  });

  const list = await prisma.todoList.create({
    data: {
      projectSlug,
      name: name.trim(),
      order: (max._max.order ?? -1) + 1,
      createdById: session.user.id,
    },
    include: { createdBy: { select: { name: true } }, items: true },
  });

  revalidatePath(`/projects/${projectSlug}/todos`);
  return { list };
}

export async function deleteList(listId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const list = await prisma.todoList.findUnique({ where: { id: listId } });
  if (!list) return { error: "Not found" };
  if (list.createdById !== session.user.id) return { error: "Not authorized" };

  await prisma.todoList.delete({ where: { id: listId } });
  revalidatePath(`/projects/${list.projectSlug}/todos`);
}

export async function createItem(listId: string, projectSlug: string, title: string, dueDate?: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const max = await prisma.todoItem.aggregate({
    where: { listId },
    _max: { order: true },
  });

  const item = await prisma.todoItem.create({
    data: {
      listId,
      projectSlug,
      title: title.trim(),
      dueDate: dueDate ? new Date(dueDate) : null,
      order: (max._max.order ?? -1) + 1,
      createdById: session.user.id,
    },
    include: { createdBy: { select: { name: true } } },
  });

  revalidatePath(`/projects/${projectSlug}/todos`);
  return { item };
}

export async function toggleItem(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const item = await prisma.todoItem.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Not found" };

  await prisma.todoItem.update({
    where: { id: itemId },
    data: { done: !item.done },
  });

  revalidatePath(`/projects/${item.projectSlug}/todos`);
}

export async function deleteItem(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const item = await prisma.todoItem.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Not found" };
  if (item.createdById !== session.user.id) return { error: "Not authorized" };

  await prisma.todoItem.delete({ where: { id: itemId } });
  revalidatePath(`/projects/${item.projectSlug}/todos`);
}

"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";


export async function createTask(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;
  const userId = session.user.id;

  const orgId = formData.get("orgId") as string;
  const slug = formData.get("slug") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  if (!title) return;

  const member = await prisma.organisationMember.findUnique({
    where: { organisationId_userId: { organisationId: orgId, userId } },
  });
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { ownerId: true },
  });
  if (!member && org?.ownerId !== userId) return;

  await prisma.workspaceTask.create({
    data: { organisationId: orgId, createdById: userId, title, description },
  });

  revalidatePath(`/work/${slug}/tasks`);
}

export async function toggleTask(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;
  const userId = session.user.id;

  const taskId = formData.get("taskId") as string;
  const currentDone = formData.get("done") as string;
  const slug = formData.get("slug") as string;

  const task = await prisma.workspaceTask.findUnique({
    where: { id: taskId },
    select: { organisationId: true },
  });
  if (!task) return;

  const member = await prisma.organisationMember.findUnique({
    where: { organisationId_userId: { organisationId: task.organisationId, userId } },
  });
  const org = await prisma.organisation.findUnique({
    where: { id: task.organisationId },
    select: { ownerId: true },
  });
  if (!member && org?.ownerId !== userId) return;

  await prisma.workspaceTask.update({
    where: { id: taskId },
    data: { done: currentDone !== "true" },
  });

  revalidatePath(`/work/${slug}/tasks`);
}

export async function approveJoinRequest(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;
  const userId = session.user.id;

  const requestId = formData.get("requestId") as string;
  const slug = formData.get("slug") as string;

  const request = await prisma.organisationJoinRequest.findUnique({
    where: { id: requestId },
    select: { organisationId: true, userId: true },
  });
  if (!request) return;

  const org = await prisma.organisation.findUnique({
    where: { id: request.organisationId },
    select: { ownerId: true },
  });
  const callerMember = await prisma.organisationMember.findUnique({
    where: { organisationId_userId: { organisationId: request.organisationId, userId } },
    select: { role: true },
  });
  if (org?.ownerId !== userId && callerMember?.role !== "admin") return;

  await prisma.$transaction([
    prisma.organisationJoinRequest.update({
      where: { id: requestId },
      data: { status: "approved" },
    }),
    prisma.organisationMember.upsert({
      where: {
        organisationId_userId: {
          organisationId: request.organisationId,
          userId: request.userId,
        },
      },
      create: { organisationId: request.organisationId, userId: request.userId },
      update: {},
    }),
  ]);

  revalidatePath(`/work/${slug}/admin`);
}

export async function rejectJoinRequest(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;
  const userId = session.user.id;

  const requestId = formData.get("requestId") as string;
  const slug = formData.get("slug") as string;

  const request = await prisma.organisationJoinRequest.findUnique({
    where: { id: requestId },
    select: { organisationId: true },
  });
  if (!request) return;

  const org = await prisma.organisation.findUnique({
    where: { id: request.organisationId },
    select: { ownerId: true },
  });
  const callerMember = await prisma.organisationMember.findUnique({
    where: { organisationId_userId: { organisationId: request.organisationId, userId } },
    select: { role: true },
  });
  if (org?.ownerId !== userId && callerMember?.role !== "admin") return;

  await prisma.organisationJoinRequest.update({
    where: { id: requestId },
    data: { status: "rejected" },
  });

  revalidatePath(`/work/${slug}/admin`);
}

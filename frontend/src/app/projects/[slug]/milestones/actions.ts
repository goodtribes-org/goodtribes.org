"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";

const prisma = new PrismaClient();

async function requireOwnerOrAdmin(projectId: string, userId: string) {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return membership && ["owner", "admin"].includes(membership.role);
}

export async function createMilestone(projectId: string, slug: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await requireOwnerOrAdmin(projectId, session.user.id))) return;

  const title = (formData.get("title") as string).trim();
  if (!title) return;
  const description = (formData.get("description") as string | null)?.trim() || null;
  const dueDateRaw = formData.get("dueDate") as string | null;
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;

  const milestone = await prisma.milestone.create({
    data: { projectId, title, description, dueDate, createdById: session.user.id },
  });

  await logActivity(projectId, session.user.id, "milestone_added", { title: milestone.title });
  revalidatePath(`/projects/${slug}/milestones`);
}

export async function toggleMilestone(id: string, slug: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const milestone = await prisma.milestone.findUnique({ where: { id } });
  if (!milestone) return;
  if (!(await requireOwnerOrAdmin(milestone.projectId, session.user.id))) return;

  const newStatus = milestone.status === "done" ? "pending" : "done";
  await prisma.milestone.update({ where: { id }, data: { status: newStatus } });

  if (newStatus === "done") {
    await logActivity(milestone.projectId, session.user.id, "milestone_completed", { title: milestone.title });
  }
  revalidatePath(`/projects/${slug}/milestones`);
}

export async function deleteMilestone(id: string, slug: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const milestone = await prisma.milestone.findUnique({ where: { id } });
  if (!milestone) return;
  if (!(await requireOwnerOrAdmin(milestone.projectId, session.user.id))) return;

  await prisma.milestone.delete({ where: { id } });
  revalidatePath(`/projects/${slug}/milestones`);
}

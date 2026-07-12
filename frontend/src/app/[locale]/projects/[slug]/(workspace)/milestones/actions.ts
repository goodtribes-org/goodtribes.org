"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";

const requireOwnerOrAdmin = (projectId: string, userId: string) =>
  hasProjectRole(projectId, userId, PROJECT_LEAD_ROLES);

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
  revalidatePath(`/projects/${slug}/calendar`);
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
  revalidatePath(`/projects/${slug}/calendar`);
}

export async function deleteMilestone(id: string, slug: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const milestone = await prisma.milestone.findUnique({ where: { id } });
  if (!milestone) return;
  if (!(await requireOwnerOrAdmin(milestone.projectId, session.user.id))) return;

  await prisma.milestone.delete({ where: { id } });
  revalidatePath(`/projects/${slug}/milestones`);
  revalidatePath(`/projects/${slug}/calendar`);
}

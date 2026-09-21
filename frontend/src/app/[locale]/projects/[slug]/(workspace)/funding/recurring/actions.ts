"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import type { RecurringFundingType, RecurringFundingInterval } from "@prisma/client";

export async function addRecurringFundingSource(projectSlug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) throw new Error("Projektet hittades inte");
  if (!(await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES))) throw new Error("Forbidden");

  const label = (formData.get("label") as string)?.trim();
  const type = formData.get("type") as RecurringFundingType;
  const interval = formData.get("interval") as RecurringFundingInterval;
  const amountSek = parseInt(formData.get("amountSek") as string, 10);
  const sourceName = (formData.get("sourceName") as string | null)?.trim() || null;
  const note = (formData.get("note") as string | null)?.trim() || null;

  if (!label || isNaN(amountSek) || amountSek <= 0) return;

  await prisma.recurringFundingSource.create({
    data: { projectId: project.id, label, type, interval, amountSek, sourceName, note, createdById: userId, startedAt: new Date() },
  });

  revalidatePath(`/projects/${projectSlug}/funding/recurring`);
  revalidatePath(`/projects/${projectSlug}/impact`);
}

export async function endRecurringFundingSource(id: string, projectSlug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) throw new Error("Projektet hittades inte");
  if (!(await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES))) throw new Error("Forbidden");

  await prisma.recurringFundingSource.update({
    where: { id },
    data: { endedAt: new Date(), updatedById: userId },
  });

  revalidatePath(`/projects/${projectSlug}/funding/recurring`);
  revalidatePath(`/projects/${projectSlug}/impact`);
}

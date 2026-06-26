"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function logTime(
  kanbanCardId: string,
  hours: number,
  note: string,
  projectSlug: string,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const userId = session.user.id;

  // Check no existing pending/approved TimeLog for this card + user
  const existing = await prisma.timeLog.findFirst({
    where: {
      kanbanCardId,
      userId,
      status: { in: ["pending", "approved"] },
    },
  });
  if (existing) {
    return { error: "Du har redan loggat tid för det här kortet." };
  }

  await prisma.timeLog.create({
    data: {
      kanbanCardId,
      userId,
      loggedHours: hours,
      note: note.trim() || null,
      status: "pending",
    },
  });

  revalidatePath(`/projects/${projectSlug}/tokens`);
  return {};
}

async function getProjectOwnerIdBySlug(slug: string): Promise<string | null> {
  const project = await prisma.project.findUnique({
    where: { slug },
    select: { ownerId: true },
  });
  return project?.ownerId ?? null;
}

export async function approveTimeLog(
  timeLogId: string,
  projectSlug: string,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const userId = session.user.id;

  const ownerId = await getProjectOwnerIdBySlug(projectSlug);
  if (ownerId !== userId) return { error: "Not authorized" };

  const timeLog = await prisma.timeLog.findUnique({
    where: { id: timeLogId },
    include: { kanbanCard: { select: { title: true } } },
  });
  if (!timeLog) return { error: "TimeLog not found" };
  if (timeLog.status !== "pending") return { error: "Tidsloggen är inte väntande" };

  await prisma.timeLog.update({
    where: { id: timeLogId },
    data: {
      status: "approved",
      reviewedBy: userId,
      reviewedAt: new Date(),
    },
  });

  await prisma.tokenLedger.create({
    data: {
      userId: timeLog.userId,
      projectSlug,
      kanbanCardId: timeLog.kanbanCardId,
      tokens: timeLog.loggedHours,
      reason: `Godkänd tidslogg: ${timeLog.kanbanCard.title}`,
    },
  });

  revalidatePath(`/projects/${projectSlug}/tokens`);
  return {};
}

export async function rejectTimeLog(
  timeLogId: string,
  projectSlug: string,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const userId = session.user.id;

  const ownerId = await getProjectOwnerIdBySlug(projectSlug);
  if (ownerId !== userId) return { error: "Not authorized" };

  const timeLog = await prisma.timeLog.findUnique({ where: { id: timeLogId } });
  if (!timeLog) return { error: "TimeLog not found" };
  if (timeLog.status !== "pending") return { error: "Tidsloggen är inte väntande" };

  await prisma.timeLog.update({
    where: { id: timeLogId },
    data: {
      status: "rejected",
      reviewedBy: userId,
      reviewedAt: new Date(),
    },
  });

  revalidatePath(`/projects/${projectSlug}/tokens`);
  return {};
}

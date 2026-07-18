"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { hasProjectRole, isRealMember, isCardClaimant } from "@/lib/authz";
import { createNotification } from "@/lib/notify";


export async function logTime(
  kanbanCardId: string,
  hours: number,
  note: string,
  projectSlug: string,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const userId = session.user.id;

  const card = await prisma.kanbanCard.findUnique({
    where: { id: kanbanCardId },
    select: { assigneeId: true, openToPublic: true, project: { select: { id: true } } },
  });
  if (!card) return { error: "Card not found" };
  const allowed = (await isRealMember(card.project.id, userId)) || isCardClaimant(card, userId);
  if (!allowed) return { error: "Not authorized to log time on this card" };

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

async function isProjectFounder(slug: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
  if (!project) return false;
  return hasProjectRole(project.id, userId, ["FOUNDER"]);
}

export async function approveTimeLog(
  timeLogId: string,
  projectSlug: string,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const userId = session.user.id;

  if (!(await isProjectFounder(projectSlug, userId))) return { error: "Not authorized" };

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

  await createNotification({
    userId: timeLog.userId,
    type: "time_log_approved",
    title: `Your logged time on "${timeLog.kanbanCard.title}" was approved`,
    url: `/projects/${projectSlug}/tokens`,
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

  if (!(await isProjectFounder(projectSlug, userId))) return { error: "Not authorized" };

  const timeLog = await prisma.timeLog.findUnique({
    where: { id: timeLogId },
    include: { kanbanCard: { select: { title: true } } },
  });
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

  await createNotification({
    userId: timeLog.userId,
    type: "time_log_rejected",
    title: `Your logged time on "${timeLog.kanbanCard.title}" was not approved`,
    url: `/projects/${projectSlug}/tokens`,
  });

  revalidatePath(`/projects/${projectSlug}/tokens`);
  return {};
}

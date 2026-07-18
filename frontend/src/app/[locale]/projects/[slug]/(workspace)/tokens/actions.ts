"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { hasProjectRole, isRealMember, isCardClaimant } from "@/lib/authz";
import { createNotification } from "@/lib/notify";
import { getPriorityTokenValue } from "@/lib/priorityTokens";

const CREATOR_BONUS_TOKENS = 5;
const APPROVER_BONUS_TOKENS = 5;
const GT_MIRROR_RATE = 0.1;


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
    include: { kanbanCard: true },
  });
  if (!timeLog) return { error: "TimeLog not found" };
  if (timeLog.status !== "pending") return { error: "Tidsloggen är inte väntande" };

  const card = timeLog.kanbanCard;

  await prisma.$transaction(async (tx) => {
    // Safety net: a card approved without ever passing through "Doing" (e.g. logged
    // straight from Backlog) locks its priority/token value right here instead.
    const tokenValue = card.lockedTokenValue ?? getPriorityTokenValue(card.priority);
    if (!card.priorityLockedAt) {
      await tx.kanbanCard.update({
        where: { id: card.id },
        data: { priorityLockedAt: new Date(), lockedTokenValue: tokenValue },
      });
    }

    const isFirstApproval =
      (await tx.timeLog.count({ where: { kanbanCardId: card.id, status: "approved" } })) === 0;

    await tx.timeLog.update({
      where: { id: timeLogId },
      data: { status: "approved", reviewedBy: userId, reviewedAt: new Date() },
    });

    // The priority's fixed value is split between everyone with an approved
    // timelog on this card so far — non-retroactive, each approval computed
    // from the state at that moment (see plan for the fairness trade-off).
    const distinctExecutors = await tx.timeLog.findMany({
      where: { kanbanCardId: card.id, status: "approved" },
      distinct: ["userId"],
      select: { userId: true },
    });
    const executorShare = tokenValue / Math.max(distinctExecutors.length, 1);

    const mintedRows: { userId: string; tokens: number; reason: string }[] = [
      { userId: timeLog.userId, tokens: executorShare, reason: `Prioritetsbaserad utbetalning (${card.priority}): ${card.title}` },
    ];
    if (isFirstApproval) {
      mintedRows.push({ userId: card.createdById, tokens: CREATOR_BONUS_TOKENS, reason: `Kortskapare-bonus: ${card.title}` });
      mintedRows.push({ userId, tokens: APPROVER_BONUS_TOKENS, reason: `Godkännande-bonus: ${card.title}` });
    }

    for (const row of mintedRows) {
      const ledgerRow = await tx.tokenLedger.create({
        data: {
          userId: row.userId,
          projectSlug,
          kanbanCardId: card.id,
          tokens: row.tokens,
          reason: row.reason,
        },
      });
      await tx.gtLedger.create({
        data: {
          userId: row.userId,
          tokens: row.tokens * GT_MIRROR_RATE,
          sourceTokenLedgerId: ledgerRow.id,
          reason: `GT-spegling: ${row.reason}`,
        },
      });
    }
  });

  await createNotification({
    userId: timeLog.userId,
    type: "time_log_approved",
    title: `Your logged time on "${card.title}" was approved`,
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

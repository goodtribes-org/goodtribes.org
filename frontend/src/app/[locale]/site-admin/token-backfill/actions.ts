"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/authz";
import { getPriorityTokenValue } from "@/lib/priorityTokens";
import { awardTokens, computeCardPayees } from "@/lib/tokens";
import { createNotification } from "@/lib/notify";

const CANDIDATE_CAP = 500;

async function findCandidates() {
  return prisma.kanbanCard.findMany({
    where: {
      column: "DONE",
      tokenLedger: { none: {} },
    },
    select: {
      id: true,
      title: true,
      priority: true,
      lockedTokenValue: true,
      assigneeId: true,
      projectSlug: true,
      project: { select: { title: true } },
      assignee: { select: { id: true, name: true } },
      subtasks: { select: { done: true, completedById: true } },
    },
    orderBy: { createdAt: "asc" },
    take: CANDIDATE_CAP,
  });
}

export type BackfillCandidate = Awaited<ReturnType<typeof findCandidates>>[number] & {
  tokenValue: number;
  payees: Array<{ userId: string; tokens: number }>;
};

export async function getBackfillCandidates(): Promise<{ candidates: BackfillCandidate[]; cappedAt: number | null }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireSiteAdmin(session.user.id);

  const cards = await findCandidates();
  const candidates = cards.map((c) => {
    const tokenValue = c.lockedTokenValue ?? getPriorityTokenValue(c.priority);
    const payees = computeCardPayees({ tokenValue, subtasks: c.subtasks, assigneeId: c.assigneeId });
    return { ...c, tokenValue, payees };
  });
  return { candidates, cappedAt: candidates.length === CANDIDATE_CAP ? CANDIDATE_CAP : null };
}

export async function runTokenBackfill(): Promise<{ paid: number; skippedNoPayee: number; totalTokens: number }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireSiteAdmin(session.user.id);

  // Re-fetch at execution time rather than trusting a client-passed list — the
  // dry-run view is just a preview, this is the actual source of truth for what
  // gets paid.
  const cards = await findCandidates();

  let paid = 0;
  let skippedNoPayee = 0;
  let totalTokens = 0;

  for (const card of cards) {
    const tokenValue = card.lockedTokenValue ?? getPriorityTokenValue(card.priority);
    const payees = computeCardPayees({ tokenValue, subtasks: card.subtasks, assigneeId: card.assigneeId });
    if (payees.length === 0) { skippedNoPayee++; continue; }

    const minted = await prisma.$transaction(async (tx) => {
      // Double-check inside the transaction: guards against a card being paid
      // out by a concurrent normal approval between the query above and now.
      const alreadyPaid = await tx.tokenLedger.count({ where: { kanbanCardId: card.id } });
      if (alreadyPaid > 0) return false;

      if (!card.lockedTokenValue) {
        await tx.kanbanCard.update({
          where: { id: card.id },
          data: { priorityLockedAt: new Date(), lockedTokenValue: tokenValue },
        });
      }
      for (const payee of payees) {
        await awardTokens(tx, {
          userId: payee.userId,
          projectSlug: card.projectSlug,
          kanbanCardId: card.id,
          tokens: payee.tokens,
          reason: `Bakfyllning: klart kort utan tidigare utbetalning (${card.priority}): ${card.title}`,
        });
      }
      return true;
    });
    if (!minted) continue;

    for (const payee of payees) {
      await createNotification({
        userId: payee.userId,
        type: "card_tokens_awarded",
        title: `You were awarded tokens for the completed task "${card.title}"`,
        url: `/projects/${card.projectSlug}/tokens`,
      });
    }

    paid++;
    totalTokens += tokenValue;
  }

  revalidatePath("/site-admin/token-backfill");
  return { paid, skippedNoPayee, totalTokens };
}

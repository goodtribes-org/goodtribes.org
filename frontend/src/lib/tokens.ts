import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeCardPayees, CREATOR_BONUS_TOKENS, APPROVER_BONUS_TOKENS, type SubtaskForPayout } from "./payoutMath";

export { computeCardPayees, CREATOR_BONUS_TOKENS, APPROVER_BONUS_TOKENS, type SubtaskForPayout };

const GT_MIRROR_RATE = 0.1;

// A user's total GT balance across the whole platform — used to weight
// votes in platform-wide polls (Granskningsrådet elections, PRD 5.53).
// GtLedger is append-only and otherwise write-only (see awardTokens below),
// so this is the first place it's actually aggregated/read.
export async function getGtBalance(userId: string): Promise<number> {
  const aggregate = await prisma.gtLedger.aggregate({
    where: { userId },
    _sum: { tokens: true },
  });
  return aggregate._sum.tokens ?? 0;
}

// Single place that mints a project-scoped Tribe Token and its 10% platform-level
// GT mirror together — every token award (time-log approval, admin backfills, …)
// should go through this so the two ledgers never drift apart.
export async function awardTokens(
  tx: Prisma.TransactionClient,
  params: { userId: string; projectSlug: string; kanbanCardId?: string | null; tokens: number; reason: string }
) {
  const ledgerRow = await tx.tokenLedger.create({
    data: {
      userId: params.userId,
      projectSlug: params.projectSlug,
      kanbanCardId: params.kanbanCardId ?? null,
      tokens: params.tokens,
      reason: params.reason,
    },
  });
  await tx.gtLedger.create({
    data: {
      userId: params.userId,
      tokens: params.tokens * GT_MIRROR_RATE,
      sourceTokenLedgerId: ledgerRow.id,
      reason: `GT-spegling: ${params.reason}`,
    },
  });
  return ledgerRow;
}

// The full payout for a card reaching Done through the normal flow: subtask/
// assignee payees, plus the one-time creator and approver bonuses. (The
// site-admin backfill tool deliberately does NOT include the creator/approver
// bonuses — it calls computeCardPayees directly instead of this.)
export async function mintCardCompletion(
  tx: Prisma.TransactionClient,
  params: {
    card: { id: string; projectSlug: string; title: string; priority: string; createdById: string };
    tokenValue: number;
    subtasks: SubtaskForPayout[];
    assigneeId: string | null;
    approverId: string;
  }
) {
  const payees = computeCardPayees({ tokenValue: params.tokenValue, subtasks: params.subtasks, assigneeId: params.assigneeId });
  for (const payee of payees) {
    await awardTokens(tx, {
      userId: payee.userId,
      projectSlug: params.card.projectSlug,
      kanbanCardId: params.card.id,
      tokens: payee.tokens,
      reason: `Prioritetsbaserad utbetalning (${params.card.priority}): ${params.card.title}`,
    });
  }
  await awardTokens(tx, {
    userId: params.card.createdById,
    projectSlug: params.card.projectSlug,
    kanbanCardId: params.card.id,
    tokens: CREATOR_BONUS_TOKENS,
    reason: `Kortskapare-bonus: ${params.card.title}`,
  });
  await awardTokens(tx, {
    userId: params.approverId,
    projectSlug: params.card.projectSlug,
    kanbanCardId: params.card.id,
    tokens: APPROVER_BONUS_TOKENS,
    reason: `Godkännande-bonus: ${params.card.title}`,
  });
  return payees;
}

// Undoes every token award tied to a card — used when a card is moved back
// out of Done (see kanbanMove.ts), since the completion it was paid for no
// longer stands. GtLedger mirrors use onDelete: SetNull, not Cascade, so they
// must be deleted explicitly or they'd become orphaned rows that still count
// toward a user's GT balance after the Tribe Token award is gone. Returns the
// distinct user ids who had tokens removed, so the caller can notify them.
export async function reverseCardTokens(tx: Prisma.TransactionClient, cardId: string): Promise<string[]> {
  const ledgerRows = await tx.tokenLedger.findMany({
    where: { kanbanCardId: cardId },
    select: { id: true, userId: true },
  });
  if (ledgerRows.length === 0) return [];

  const ledgerIds = ledgerRows.map((r) => r.id);
  await tx.gtLedger.deleteMany({ where: { sourceTokenLedgerId: { in: ledgerIds } } });
  await tx.tokenLedger.deleteMany({ where: { id: { in: ledgerIds } } });

  return [...new Set(ledgerRows.map((r) => r.userId))];
}

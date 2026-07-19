import type { Prisma } from "@prisma/client";

const GT_MIRROR_RATE = 0.1;

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

export const CREATOR_BONUS_TOKENS = 5;
export const APPROVER_BONUS_TOKENS = 5;

export type SubtaskForPayout = { completedById: string | null };

// A card's fixed priority-value token pool is split between whoever completed
// its subtasks, weighted by how many subtasks each person completed. Falls
// back to the assignee when there's no subtask completer to attribute to —
// either the card has no subtasks, or (for cards finished before this field
// existed) the subtasks are done but nobody's recorded against them.
export function computeCardPayees(params: {
  tokenValue: number;
  subtasks: SubtaskForPayout[];
  assigneeId: string | null;
}): Array<{ userId: string; tokens: number }> {
  const attributed = params.subtasks.filter((s): s is { completedById: string } => !!s.completedById);
  if (attributed.length > 0) {
    const counts = new Map<string, number>();
    for (const s of attributed) counts.set(s.completedById, (counts.get(s.completedById) ?? 0) + 1);
    return Array.from(counts.entries()).map(([userId, count]) => ({
      userId,
      tokens: (params.tokenValue * count) / attributed.length,
    }));
  }
  if (params.assigneeId) return [{ userId: params.assigneeId, tokens: params.tokenValue }];
  return [];
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

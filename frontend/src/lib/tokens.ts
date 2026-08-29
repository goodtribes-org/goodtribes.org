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
//
// `idempotencyKey` is optional: pass a stable, caller-chosen key derived from
// the real-world event being paid out for (e.g. a Stripe session id) when
// that event could plausibly fire more than once (webhook redelivery, a
// double-submitted form, a retried job). If a TokenLedger row with that key
// already exists, it's returned as-is with no new award or GT mirror created
// — the mint chokepoint itself refuses the duplicate, instead of every caller
// having to invent its own protection. Omit it for awards with no natural
// replay risk (nothing changes from before). Two concurrent calls with the
// same new key race on the column's unique constraint; the loser gets a
// Prisma P2002 from this create and should treat that as "already awarded,
// no-op" (see the Stripe webhook's existing P2002-catch for the pattern).
export async function awardTokens(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    projectSlug: string;
    kanbanCardId?: string | null;
    tokens: number;
    reason: string;
    idempotencyKey?: string | null;
  }
) {
  if (params.idempotencyKey) {
    const existing = await tx.tokenLedger.findUnique({ where: { idempotencyKey: params.idempotencyKey } });
    if (existing) return existing;
  }

  const ledgerRow = await tx.tokenLedger.create({
    data: {
      userId: params.userId,
      projectSlug: params.projectSlug,
      kanbanCardId: params.kanbanCardId ?? null,
      tokens: params.tokens,
      reason: params.reason,
      idempotencyKey: params.idempotencyKey ?? null,
    },
  });
  const gtTokens = params.tokens * GT_MIRROR_RATE;
  const gtRow = await tx.gtLedger.create({
    data: {
      userId: params.userId,
      tokens: gtTokens,
      sourceTokenLedgerId: ledgerRow.id,
      reason: `GT-spegling: ${params.reason}`,
    },
  });
  // Double-entry journal (LedgerJournalEntry, see its schema comment): one
  // MINT leg + one USER leg per currency, sharing this award's transactionId
  // (the TokenLedger row's own id -- already unique and scoped to exactly
  // this one economic event). Always sums to 0 per currency.
  await writeMintJournalLegs(tx, {
    transactionId: ledgerRow.id,
    userId: params.userId,
    projectSlug: params.projectSlug,
    tokenLedgerId: ledgerRow.id,
    gtLedgerId: gtRow.id,
    tribeTokens: params.tokens,
    gtTokens,
    reason: params.reason,
  });
  return ledgerRow;
}

async function writeMintJournalLegs(
  tx: Prisma.TransactionClient,
  params: {
    transactionId: string;
    userId: string;
    projectSlug: string;
    tokenLedgerId: string;
    gtLedgerId: string;
    tribeTokens: number;
    gtTokens: number;
    reason: string;
  }
) {
  await tx.ledgerJournalEntry.createMany({
    data: [
      {
        transactionId: params.transactionId,
        currency: "TRIBE_TOKEN",
        account: "MINT",
        amount: -params.tribeTokens,
        projectSlug: params.projectSlug,
        tokenLedgerId: params.tokenLedgerId,
        reason: params.reason,
      },
      {
        transactionId: params.transactionId,
        currency: "TRIBE_TOKEN",
        account: "USER",
        amount: params.tribeTokens,
        userId: params.userId,
        projectSlug: params.projectSlug,
        tokenLedgerId: params.tokenLedgerId,
        reason: params.reason,
      },
      {
        transactionId: params.transactionId,
        currency: "GT",
        account: "MINT",
        amount: -params.gtTokens,
        gtLedgerId: params.gtLedgerId,
        reason: `GT-spegling: ${params.reason}`,
      },
      {
        transactionId: params.transactionId,
        currency: "GT",
        account: "USER",
        amount: params.gtTokens,
        userId: params.userId,
        gtLedgerId: params.gtLedgerId,
        reason: `GT-spegling: ${params.reason}`,
      },
    ],
  });
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
    select: { id: true, userId: true, projectSlug: true, tokens: true, reason: true },
  });
  if (ledgerRows.length === 0) return [];

  const ledgerIds = ledgerRows.map((r) => r.id);
  const gtRows = await tx.gtLedger.findMany({
    where: { sourceTokenLedgerId: { in: ledgerIds } },
    select: { id: true, sourceTokenLedgerId: true, tokens: true },
  });
  const gtRowByTokenLedgerId = new Map(gtRows.map((r) => [r.sourceTokenLedgerId, r]));

  // Reversal journal legs first, while the TokenLedger/GtLedger rows being
  // reversed still exist to reference (their FK on this table is
  // onDelete: SetNull — see LedgerJournalEntry's schema comment: a reversal
  // writes NEW opposite-signed legs, it never deletes the original mint
  // legs, so the audit trail always shows what actually happened). Each
  // original award gets its own reversal transactionId, derived
  // deterministically from the award being reversed rather than randomly
  // generated, so it's traceable without needing a lookup.
  for (const row of ledgerRows) {
    const gtRow = gtRowByTokenLedgerId.get(row.id);
    if (!gtRow) continue; // shouldn't happen (awardTokens always mints both together), but nothing to reverse if it did
    await writeMintJournalLegs(tx, {
      transactionId: `reverse:${row.id}`,
      userId: row.userId,
      projectSlug: row.projectSlug,
      tokenLedgerId: row.id,
      gtLedgerId: gtRow.id,
      tribeTokens: -row.tokens,
      gtTokens: -gtRow.tokens,
      reason: `Återförd: ${row.reason}`,
    });
  }

  await tx.gtLedger.deleteMany({ where: { sourceTokenLedgerId: { in: ledgerIds } } });
  await tx.tokenLedger.deleteMany({ where: { id: { in: ledgerIds } } });

  return [...new Set(ledgerRows.map((r) => r.userId))];
}

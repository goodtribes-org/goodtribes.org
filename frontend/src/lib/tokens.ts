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

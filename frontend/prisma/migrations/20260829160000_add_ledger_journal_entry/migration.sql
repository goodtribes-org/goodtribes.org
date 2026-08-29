-- Double-entry audit trail for TokenLedger/GtLedger, per the "Blueprint for
-- GoodTribes" architecture memo's "harden the ledger boundary" point (see
-- CLAUDE.md and LedgerJournalEntry's own schema comment for the full
-- design). Purely additive -- two new enums and one new table with
-- SetNull FKs back to TokenLedger/GtLedger, nothing existing is altered.
--
-- Hand-written per this repo's CLAUDE.md migration-safety workflow. The raw
-- `prisma migrate diff --shadow-database-url` output was NOT used as-is: it
-- contained the already-documented, unrelated TimeLog table drift (see
-- CLAUDE.md's Known Issues) -- confirmed by re-running the same diff
-- against completely unmodified schema, which reproduced the identical
-- drift. Stripped out; everything below is otherwise identical to the raw
-- diff output for this genuinely additive change.

-- CreateEnum
CREATE TYPE "LedgerCurrency" AS ENUM ('TRIBE_TOKEN', 'GT');

-- CreateEnum
CREATE TYPE "LedgerAccount" AS ENUM ('MINT', 'USER');

-- CreateTable
CREATE TABLE "LedgerJournalEntry" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "currency" "LedgerCurrency" NOT NULL,
    "account" "LedgerAccount" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "userId" TEXT,
    "projectSlug" TEXT,
    "tokenLedgerId" TEXT,
    "gtLedgerId" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerJournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LedgerJournalEntry_transactionId_idx" ON "LedgerJournalEntry"("transactionId");

-- CreateIndex
CREATE INDEX "LedgerJournalEntry_userId_idx" ON "LedgerJournalEntry"("userId");

-- CreateIndex
CREATE INDEX "LedgerJournalEntry_tokenLedgerId_idx" ON "LedgerJournalEntry"("tokenLedgerId");

-- CreateIndex
CREATE INDEX "LedgerJournalEntry_gtLedgerId_idx" ON "LedgerJournalEntry"("gtLedgerId");

-- AddForeignKey
ALTER TABLE "LedgerJournalEntry" ADD CONSTRAINT "LedgerJournalEntry_tokenLedgerId_fkey" FOREIGN KEY ("tokenLedgerId") REFERENCES "TokenLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerJournalEntry" ADD CONSTRAINT "LedgerJournalEntry_gtLedgerId_fkey" FOREIGN KEY ("gtLedgerId") REFERENCES "GtLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

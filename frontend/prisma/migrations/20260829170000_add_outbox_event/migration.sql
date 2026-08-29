-- Generic transactional outbox, point 06 of the "Blueprint for GoodTribes"
-- architecture memo (see CLAUDE.md and OutboxEvent's own schema comment).
-- Purely additive -- one new enum and one new table, nothing existing is
-- altered.
--
-- Hand-written per this repo's CLAUDE.md migration-safety workflow. The raw
-- `prisma migrate diff --shadow-database-url` output was NOT used as-is: it
-- contained the already-documented, unrelated TimeLog table drift (see
-- CLAUDE.md's Known Issues) -- confirmed by re-running the same diff
-- against completely unmodified schema, which reproduced the identical
-- drift. Stripped out; everything below is otherwise identical to the raw
-- diff output for this genuinely additive change.

-- CreateEnum
CREATE TYPE "OutboxEventStatus" AS ENUM ('pending', 'processed');

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxEventStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutboxEvent_status_createdAt_idx" ON "OutboxEvent"("status", "createdAt");

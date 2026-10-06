-- Drafts replace Sandbox (#226). NULL publishedAt = a draft that only the
-- project's members and site admins can see. Every project that exists
-- today is already public, so all of them are backfilled as published at
-- their creation time — nothing disappears for visitors.
-- "isSandbox" is left in place (no longer read) and dropped in a follow-up.

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- Backfill
UPDATE "Project" SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL;

-- CreateIndex
CREATE INDEX "Project_publishedAt_idx" ON "Project"("publishedAt");

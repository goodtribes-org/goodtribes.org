-- Verification fields for ImpactReport (PRD 4d — verified SDG outcomes).
-- Purely additive: every new column is nullable, so existing rows are
-- untouched and no backfill is needed. Generated with a schema-to-schema
-- `prisma migrate diff` (not `--from-migrations`, which currently can't
-- replay from scratch until PR #61's migration rename lands) and reviewed
-- by hand per CLAUDE.md's migration-safety workflow.

-- AlterTable
ALTER TABLE "ImpactReport" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "evidenceUrl" TEXT,
ADD COLUMN     "metricUnit" TEXT,
ADD COLUMN     "periodEnd" TIMESTAMP(3),
ADD COLUMN     "periodStart" TIMESTAMP(3),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "reviewNote" TEXT;

-- CreateIndex
CREATE INDEX "ImpactReport_verifiedAt_idx" ON "ImpactReport"("verifiedAt");

-- AddForeignKey
ALTER TABLE "ImpactReport" ADD CONSTRAINT "ImpactReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

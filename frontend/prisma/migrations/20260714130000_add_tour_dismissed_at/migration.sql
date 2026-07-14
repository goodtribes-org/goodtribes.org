-- AlterTable: additive, nullable — no backfill risk.
ALTER TABLE "User" ADD COLUMN "tourDismissedAt" TIMESTAMP(3);
ALTER TABLE "Organisation" ADD COLUMN "tourDismissedAt" TIMESTAMP(3);

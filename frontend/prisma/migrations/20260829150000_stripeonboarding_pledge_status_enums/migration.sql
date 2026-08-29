-- Convert FundingCampaign.stripeOnboardingStatus and FundingPledge.pledgeStatus
-- from free-text String to real Prisma enums, per the "Blueprint for
-- GoodTribes" architecture memo's status-enum convention (see CLAUDE.md) and
-- caught by the new frontend/scripts/lint-schema-status-enums.mjs check.
-- Enum values are lowercase, matching every existing row and every
-- application code string literal exactly ("not_started"/"pending"/
-- "complete", "confirmed") -- no application code changes needed beyond the
-- generated types.
--
-- Hand-written per this repo's CLAUDE.md migration-safety workflow. The raw
-- `prisma migrate diff --shadow-database-url` output was NOT used as-is:
--
-- 1. It contained the already-documented, unrelated TimeLog table drift
--    (see CLAUDE.md's Known Issues) -- confirmed by re-running the same diff
--    against completely unmodified schema, which reproduced the identical
--    drift. Stripped out.
-- 2. Its proposed column changes were `DROP COLUMN ..., ADD COLUMN ... 
--    DEFAULT '...'` for both fields -- which would silently reset every
--    existing non-default row (e.g. a campaign already at "complete" or
--    "pending") back to the default on migrate, since a dropped-and-
--    recreated column has no way to carry old values forward. Replaced with
--    in-place `ALTER COLUMN ... TYPE ... USING` casts instead, matching the
--    pattern already established by this repo's other enum-conversion
--    migrations (e.g. 20260828190000_add_suggestion_status_enum).

-- CreateEnum
CREATE TYPE "StripeOnboardingStatus" AS ENUM ('not_started', 'pending', 'complete');

-- CreateEnum
CREATE TYPE "FundingPledgeStatus" AS ENUM ('confirmed');

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "FundingCampaign"
  ALTER COLUMN "stripeOnboardingStatus" DROP DEFAULT,
  ALTER COLUMN "stripeOnboardingStatus" TYPE "StripeOnboardingStatus" USING ("stripeOnboardingStatus"::"StripeOnboardingStatus"),
  ALTER COLUMN "stripeOnboardingStatus" SET DEFAULT 'not_started';

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "FundingPledge"
  ALTER COLUMN "pledgeStatus" DROP DEFAULT,
  ALTER COLUMN "pledgeStatus" TYPE "FundingPledgeStatus" USING ("pledgeStatus"::"FundingPledgeStatus"),
  ALTER COLUMN "pledgeStatus" SET DEFAULT 'confirmed';

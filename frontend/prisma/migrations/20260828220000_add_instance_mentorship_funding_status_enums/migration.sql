-- Convert ProjectInstance.status, MentorshipRequest.status, and
-- FundingCampaign.status from free-text Strings to real Prisma enums.
-- Enum values are lowercase, matching every existing row and application
-- code string literal exactly -- no application code changes needed beyond
-- the generated types. Same pattern as PR #68 (SuggestionStatus, the pilot
-- for this ~19-field String->enum conversion effort described in CLAUDE.md's
-- Known Issues).
--
-- Hand-written per this repo's CLAUDE.md migration-safety workflow. The raw
-- `prisma migrate diff --shadow-database-url` output was NOT used as-is --
-- two problems found by reviewing it before applying anything (same two
-- categories PR #68 found for SuggestionStatus):
--
-- 1. It contained unrelated pre-existing drift (TimeLog table + its three
--    FK constraints being dropped) that has nothing to do with this change --
--    confirmed by re-running the same diff against completely unmodified
--    schema.prisma, which reproduced the identical unrelated drift on its
--    own. Stripped out of this migration; not fixed here.
-- 2. Its proposed column changes were all `DROP COLUMN "status", ADD COLUMN
--    "status" ... DEFAULT '<default>'` -- which would silently reset every
--    existing non-default row (e.g. "approved"/"rejected" ProjectInstance
--    rows, "accepted"/"completed" MentorshipRequest rows, "closed"
--    FundingCampaign rows) back to that field's default on migrate, since a
--    dropped-and-recreated column can't carry old values forward. Replaced
--    with in-place `ALTER COLUMN ... TYPE ... USING` casts instead, which
--    preserve every row's actual current value. Verified against a real
--    Postgres with non-default rows seeded first -- confirmed zero data
--    loss (see the PR description for this change).

-- CreateEnum
CREATE TYPE "ProjectInstanceStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "MentorshipRequestStatus" AS ENUM ('pending', 'accepted', 'completed');

-- CreateEnum
CREATE TYPE "FundingCampaignStatus" AS ENUM ('active', 'closed');

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "ProjectInstance"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "ProjectInstanceStatus" USING ("status"::"ProjectInstanceStatus"),
  ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "MentorshipRequest"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "MentorshipRequestStatus" USING ("status"::"MentorshipRequestStatus"),
  ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "FundingCampaign"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "FundingCampaignStatus" USING ("status"::"FundingCampaignStatus"),
  ALTER COLUMN "status" SET DEFAULT 'active';

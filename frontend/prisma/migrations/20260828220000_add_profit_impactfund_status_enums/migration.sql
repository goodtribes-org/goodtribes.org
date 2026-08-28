-- Convert ProfitDistributionProposal.status and ImpactFundAllocationRound.status
-- from free-text Strings to real Prisma enums. Enum values are lowercase
-- (pending/approved_by_members/rejected_by_members/vetoed_by_foundation/executed
-- for the former; open/closed/executed for the latter), matching every
-- existing row and application code string literal exactly -- no application
-- code changes needed beyond the generated types.
--
-- Hand-written per this repo's CLAUDE.md migration-safety workflow, same
-- pattern as PR #68 (20260828190000_add_suggestion_status_enum, the
-- Suggestion.status pilot for this ~19-field conversion effort). The raw
-- `prisma migrate diff --shadow-database-url` output was NOT used as-is --
-- two problems found by reviewing it before applying anything:
--
-- 1. It contained unrelated pre-existing drift (TimeLog table + FK drops)
--    that has nothing to do with this change -- confirmed by re-running the
--    identical diff against completely unmodified schema.prisma, which
--    reproduced the same TimeLog drift on its own. Stripped out here;
--    flagging separately rather than silently fixing as a drive-by.
-- 2. Its proposed column changes were `DROP COLUMN "status", ADD COLUMN
--    "status" ... DEFAULT '...'` for both tables -- which would silently
--    reset every existing non-default row (e.g. "approved_by_members",
--    "vetoed_by_foundation", "executed", "closed") back to the default
--    ("pending"/"open") on migrate, since a dropped-and-recreated column
--    has no way to carry old values forward. For these two models that
--    would mean silently reverting a real financial/governance decision.
--    Replaced with in-place `ALTER COLUMN ... TYPE ... USING` casts
--    instead, which preserve every row's actual current value. Verified
--    against a real Postgres seeded with one row per distinct status value
--    for each model before applying this migration -- confirmed zero data
--    loss (see PR description for the full test matrix).
--
-- This pair is the highest-stakes of the ~19-field effort (both directly
-- govern real money/token movement -- see CLAUDE.md's PRD 4a Impact-fund &
-- profit distribution section) -- treated with extra scrutiny accordingly.

-- CreateEnum
CREATE TYPE "ProfitDistributionProposalStatus" AS ENUM ('pending', 'approved_by_members', 'rejected_by_members', 'vetoed_by_foundation', 'executed');

-- CreateEnum
CREATE TYPE "ImpactFundAllocationRoundStatus" AS ENUM ('open', 'closed', 'executed');

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "ProfitDistributionProposal"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "ProfitDistributionProposalStatus" USING ("status"::"ProfitDistributionProposalStatus"),
  ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "ImpactFundAllocationRound"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "ImpactFundAllocationRoundStatus" USING ("status"::"ImpactFundAllocationRoundStatus"),
  ALTER COLUMN "status" SET DEFAULT 'open';

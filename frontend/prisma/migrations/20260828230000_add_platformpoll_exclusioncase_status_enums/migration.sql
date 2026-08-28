-- Convert PlatformPoll.status and ExclusionCase.status from free-text
-- Strings to real Prisma enums. Enum values are lowercase (matching every
-- existing row and application code string literal exactly -- e.g.
-- "open"/"closed" for PlatformPoll, "open"/"under_review"/"resolved" for
-- ExclusionCase) -- no application code changes needed beyond the
-- generated types. Same pattern as PR #68's SuggestionStatus pilot
-- conversion (prisma/migrations/20260828190000_add_suggestion_status_enum).
--
-- These two models carry real platform-governance weight: PlatformPoll
-- drives Granskningsrådet council elections and Impact-fund allocation
-- rounds (GT-Token-weighted, platform-wide); ExclusionCase is
-- Granskningsrådet's reported-rule-violation/exclusion process, whose
-- "resolved" status can carry a platform ban or project ban decision.
-- Every distinct value below was found by reading every branch of every
-- action file that writes these columns (site-admin/council/actions.ts,
-- site-admin/impact-fund/actions.ts, granskningsradet/actions.ts,
-- impact-fond/actions.ts), not guessed at, and confirmed via
-- `grep -rn "prisma\.platformPoll\.\|prisma\.exclusionCase\."` across
-- frontend/src to make sure no other call site writes an undiscovered
-- value.
--
-- Hand-written per this repo's CLAUDE.md migration-safety workflow. The
-- raw `prisma migrate diff --shadow-database-url` output was NOT used
-- as-is -- two problems found by reviewing it before applying anything:
--
-- 1. It contained unrelated pre-existing drift (TimeLog table + its FK
--    constraints being dropped) that has nothing to do with this change --
--    confirmed by re-running the identical diff against completely
--    unmodified schema.prisma, which reproduced the identical unrelated
--    drift on its own. Stripped out of this migration.
-- 2. Its proposed column change for BOTH columns was
--    `DROP COLUMN "status", ADD COLUMN "status" ... NOT NULL DEFAULT
--    'open'` -- which would silently reset every existing "closed" (or,
--    for ExclusionCase, "under_review"/"resolved") row back to "open" on
--    migrate, since a dropped-and-recreated column has no way to carry
--    old values forward. This would be real, irreversible data loss for a
--    closed council election/allocation round or a decided exclusion case
--    (see CLAUDE.md's Granskningsrådet/impact-fund notes on what these
--    drive). Replaced with an in-place `ALTER COLUMN ... TYPE ... USING`
--    cast instead, which preserves every row's actual current value.
--    Verified against a real Postgres with non-default rows seeded first
--    for every distinct status value of both models -- confirmed zero
--    data loss (see PR description for the exact test).

-- CreateEnum
CREATE TYPE "PlatformPollStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "ExclusionCaseStatus" AS ENUM ('open', 'under_review', 'resolved');

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "PlatformPoll"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "PlatformPollStatus" USING ("status"::"PlatformPollStatus"),
  ALTER COLUMN "status" SET DEFAULT 'open';

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "ExclusionCase"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "ExclusionCaseStatus" USING ("status"::"ExclusionCaseStatus"),
  ALTER COLUMN "status" SET DEFAULT 'open';

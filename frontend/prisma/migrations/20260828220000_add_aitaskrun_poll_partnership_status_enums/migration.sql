-- Convert AiTaskRun.status, Poll.status, and Partnership.status from
-- free-text Strings to real Prisma enums. Enum values are lowercase
-- (matching every existing row and application code string literal
-- exactly for all three fields) -- no application code changes needed
-- beyond the generated types.
--
-- Hand-written per this repo's CLAUDE.md migration-safety workflow, same
-- pattern as the SuggestionStatus pilot (PR #68). The raw
-- `prisma migrate diff` output (generated against a real throwaway
-- shadow Postgres, never the dev DB or DATABASE_URL) was NOT used as-is --
-- two problems found by reviewing it before applying anything:
--
-- 1. It contained unrelated pre-existing drift (a TimeLog table drop with
--    its three FK constraint drops) that has nothing to do with this
--    change -- confirmed by re-running the identical diff against
--    completely unmodified schema.prisma, which reproduced the identical
--    unrelated drift on its own. Stripped out.
-- 2. Its proposed column changes were `DROP COLUMN "status", ADD COLUMN
--    "status" ... DEFAULT '...'` for all three tables -- which would
--    silently reset every existing non-default row (e.g. an
--    "awaiting_review"/"escalated" AiTaskRun, a "closed" Poll, an
--    "active"/"declined"/"revoked" Partnership) back to its column
--    default on migrate, since a dropped-and-recreated column has no way
--    to carry old values forward. Replaced with an in-place
--    `ALTER COLUMN ... TYPE ... USING` cast per field instead, which
--    preserves every row's actual current value. Verified against a real
--    Postgres with non-default rows seeded first (see the PR
--    description) -- confirmed zero data loss.

-- CreateEnum
CREATE TYPE "AiTaskRunStatus" AS ENUM ('running', 'awaiting_review', 'approved', 'rejected', 'escalated');

-- CreateEnum
CREATE TYPE "PollStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "PartnershipStatus" AS ENUM ('pending', 'active', 'declined', 'revoked');

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "AiTaskRun"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "AiTaskRunStatus" USING ("status"::"AiTaskRunStatus"),
  ALTER COLUMN "status" SET DEFAULT 'running';

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "Poll"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "PollStatus" USING ("status"::"PollStatus"),
  ALTER COLUMN "status" SET DEFAULT 'open';

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "Partnership"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "PartnershipStatus" USING ("status"::"PartnershipStatus"),
  ALTER COLUMN "status" SET DEFAULT 'pending';

-- Convert Suggestion.status from a free-text String to a real Prisma enum.
-- Enum values are lowercase (pending/reviewed/dismissed), matching every
-- existing row and application code string literal exactly -- no
-- application code changes needed beyond the generated types.
--
-- Hand-written per this repo's CLAUDE.md migration-safety workflow. The raw
-- `prisma migrate diff --shadow-database-url` output was NOT used as-is --
-- two problems found by reviewing it before applying anything:
--
-- 1. It contained unrelated pre-existing drift (Sprint FK drop/recreate, a
--    TimeLog table drop, Message/Room/RoomParticipant constraint-rename
--    tracking) that has nothing to do with this change -- confirmed by
--    re-running the same diff against completely unmodified schema.prisma,
--    which reproduced the identical unrelated drift. Stripped out.
-- 2. Its proposed column change was `DROP COLUMN "status", ADD COLUMN
--    "status" ... DEFAULT 'pending'` -- which would silently reset every
--    existing "reviewed"/"dismissed" row back to "pending" on migrate,
--    since a dropped-and-recreated column has no way to carry old values
--    forward. Replaced with an in-place `ALTER COLUMN ... TYPE ... USING`
--    cast instead, which preserves every row's actual current value.
--    Verified against a real Postgres with non-default rows seeded first
--    (see the PR description) -- confirmed zero data loss.

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('pending', 'reviewed', 'dismissed');

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "Suggestion"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "SuggestionStatus" USING ("status"::"SuggestionStatus"),
  ALTER COLUMN "status" SET DEFAULT 'pending';

-- Convert LegalTypeChangeRequest.status and SandboxGraduationRequest.status
-- from free-text Strings to real Prisma enums. Both models carry real
-- governance/legal-structure weight (member-voted legal-type transitions and
-- Foundation-decided sandbox graduations), so every distinct status value
-- was individually round-trip tested for data preservation before this was
-- written -- see the PR description for the full test matrix.
--
-- Enum values are lowercase (not this schema's usual SCREAMING_SNAKE_CASE,
-- e.g. FlagStatus), matching every existing row and application code string
-- literal exactly -- no application code changes needed beyond the
-- generated types. Same pattern as the SuggestionStatus pilot (PR #68).
--
-- Hand-written per this repo's CLAUDE.md migration-safety workflow. The raw
-- `prisma migrate diff --shadow-database-url` output was NOT used as-is --
-- two problems found by reviewing it before applying anything:
--
-- 1. It contained unrelated pre-existing drift (a TimeLog table drop/FK
--    removal) that has nothing to do with this change -- confirmed by
--    re-running the identical diff against completely unmodified
--    schema.prisma (`git show origin/main:frontend/prisma/schema.prisma`),
--    which reproduced the identical unrelated drift on its own. Stripped
--    out of this migration; not this PR's bug to fix.
-- 2. Its proposed column change for both fields was `DROP COLUMN "status",
--    ADD COLUMN "status" ... DEFAULT 'pending'` -- which would silently
--    reset every existing non-default row (e.g. "executed",
--    "rejected_by_foundation", "approved", "rejected") back to "pending" on
--    migrate, since a dropped-and-recreated column can't carry old values
--    forward. For these two governance/legal-structure models, that would
--    mean silently reverting a real Foundation/member decision back to
--    "pending" -- unacceptable data loss. Replaced with in-place
--    `ALTER COLUMN ... TYPE ... USING` casts instead, which preserve every
--    row's actual current value. Verified against a real Postgres with a
--    row seeded for every single documented status value first (see PR
--    description) -- confirmed zero data loss across all 5 + 3 values.

-- CreateEnum
CREATE TYPE "LegalTypeChangeRequestStatus" AS ENUM ('pending', 'approved_by_members', 'rejected_by_members', 'executed', 'rejected_by_foundation');

-- CreateEnum
CREATE TYPE "SandboxGraduationRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "LegalTypeChangeRequest"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "LegalTypeChangeRequestStatus" USING ("status"::"LegalTypeChangeRequestStatus"),
  ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "SandboxGraduationRequest"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "SandboxGraduationRequestStatus" USING ("status"::"SandboxGraduationRequestStatus"),
  ALTER COLUMN "status" SET DEFAULT 'pending';

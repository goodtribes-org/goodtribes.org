-- Convert OrganisationFlag.status, ProjectFlag.status,
-- OrganisationJoinRequest.status, and ProjectJoinRequest.status from
-- free-text Strings to real Prisma enums. Second/third/fourth/fifth of the
-- ~19 fields CLAUDE.md flags for this conversion (first was
-- Suggestion.status, PR #68) -- same pattern, applied to four more
-- low-risk (private/internal/moderation data, not money-moving) fields at
-- once since they're independent of each other.
--
-- Enum values are lowercase, matching every existing row and application
-- code string literal exactly for all four fields:
--   OrganisationFlag.status / ProjectFlag.status: pending | dismissed | resolved
--     (found in src/app/[locale]/site-admin/organisations/actions.ts and
--     src/app/[locale]/site-admin/ethics/actions.ts -- both `update` calls
--     only ever write "dismissed" or "resolved"; "pending" is the column
--     default and what the two site-admin/granskningsradet queue pages
--     filter on)
--   OrganisationJoinRequest.status / ProjectJoinRequest.status:
--     pending | approved | rejected (found in
--     src/app/[locale]/org/[slug]/actions.ts,
--     src/app/[locale]/work/[slug]/actions.ts, and
--     src/app/[locale]/projects/[slug]/join-actions.ts -- all three
--     `respondTo*JoinRequest` actions take a decision of exactly these two
--     non-default values; "pending" is the column default and what every
--     listing query in dashboard/page.tsx, org/[slug]/page.tsx,
--     work/[slug]/admin/page.tsx, projects/[slug]/page.tsx, and
--     lib/activityFeed.ts filters on)
-- No application code changes needed beyond the generated TypeScript types.
--
-- Hand-written per this repo's CLAUDE.md migration-safety workflow (and
-- following PR #68's exact pattern). The raw `prisma migrate diff`
-- output (generated against a real throwaway shadow Postgres -- Prisma 7
-- moved this from the CLI's `--shadow-database-url` flag into
-- prisma.config.ts's `datasource.shadowDatabaseUrl`, set locally/temporarily
-- to run the diff and reverted before committing) was NOT used as-is --
-- two problems found by reviewing it before applying anything:
--
-- 1. It contained unrelated pre-existing drift (TimeLog foreign-key drops
--    and a TimeLog table drop) that has nothing to do with this change --
--    confirmed by re-running the identical diff against completely
--    unmodified schema.prisma, which reproduced the identical unrelated
--    drift on its own. Stripped out of this migration; not this change's
--    bug to fix.
-- 2. Its proposed column change for all four fields was `DROP COLUMN
--    "status", ADD COLUMN "status" ... NOT NULL DEFAULT 'pending'` --
--    which would silently reset every existing non-default row (e.g. a
--    "resolved" flag or an "approved"/"rejected" join request) back to
--    "pending" on migrate, since a dropped-and-recreated column has no way
--    to carry old values forward. Replaced with in-place `ALTER COLUMN
--    ... TYPE ... USING` casts instead, which preserve every row's actual
--    current value. Verified against a real Postgres with non-default
--    rows seeded first for all four models (see the PR description) --
--    confirmed zero data loss.

-- CreateEnum
CREATE TYPE "OrganisationFlagStatus" AS ENUM ('pending', 'dismissed', 'resolved');

-- CreateEnum
CREATE TYPE "ProjectFlagStatus" AS ENUM ('pending', 'dismissed', 'resolved');

-- CreateEnum
CREATE TYPE "OrganisationJoinRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ProjectJoinRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "OrganisationFlag"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "OrganisationFlagStatus" USING ("status"::"OrganisationFlagStatus"),
  ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "ProjectFlag"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "ProjectFlagStatus" USING ("status"::"ProjectFlagStatus"),
  ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "OrganisationJoinRequest"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "OrganisationJoinRequestStatus" USING ("status"::"OrganisationJoinRequestStatus"),
  ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "ProjectJoinRequest"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "ProjectJoinRequestStatus" USING ("status"::"ProjectJoinRequestStatus"),
  ALTER COLUMN "status" SET DEFAULT 'pending';

-- Convert Idea.status, IdeaRevision.status, and Milestone.status from
-- free-text Strings to real Prisma enums. Enum values are lowercase, matching
-- every existing row and application code string literal exactly -- no
-- application code changes needed beyond the generated types (see
-- src/app/[locale]/ideas/[id]/actions.ts, src/app/[locale]/ideas/page.tsx,
-- and src/lib/listCache.ts for the small amount of type-narrowing this did
-- require at Server Action / query boundaries where a plain string used to
-- flow in from a client select or a URL query param).
--
-- Hand-written per this repo's CLAUDE.md migration-safety workflow and
-- following the pattern from PR #68 (SuggestionStatus, the pilot for this
-- ~19-field enum-conversion backlog). The raw `prisma migrate diff` output
-- was NOT used as-is -- two problems found by reviewing it before applying
-- anything:
--
-- 1. It contained unrelated pre-existing drift (TimeLog table + FK drops)
--    that has nothing to do with this change -- confirmed by re-running the
--    same diff against completely unmodified schema.prisma, which reproduced
--    the identical unrelated drift. Stripped out.
-- 2. Its proposed column changes were `DROP COLUMN "status", ADD COLUMN
--    "status" ... DEFAULT '...'` for all three tables -- which would
--    silently reset every existing non-default-status row back to the
--    default on migrate, since a dropped-and-recreated column has no way to
--    carry old values forward. Replaced with in-place `ALTER COLUMN ...
--    TYPE ... USING` casts instead, which preserve every row's actual
--    current value. Verified against a real Postgres with non-default rows
--    seeded first (see the PR description) -- confirmed zero data loss.
--
-- Discovered value sets (verified against application code, not just the
-- schema.prisma comments):
--   Idea.status           -- draft | open | review | shortlisted | approved | converted
--                             (src/app/[locale]/ideas/[id]/IdeaInteractions.tsx's
--                             STATUS_VALUES; "converted" set by
--                             src/lib/promoteIdea.ts's linkPromotedProject)
--   IdeaRevision.status   -- pending | accepted | rejected
--                             (src/app/[locale]/ideas/[id]/actions.ts's decideRevision)
--   Milestone.status      -- pending | done
--                             (src/app/[locale]/projects/[slug]/(workspace)/milestones/actions.ts's
--                             toggleMilestone -- a simple binary toggle)

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('draft', 'open', 'review', 'shortlisted', 'approved', 'converted');

-- CreateEnum
CREATE TYPE "IdeaRevisionStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('pending', 'done');

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "Idea"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "IdeaStatus" USING ("status"::"IdeaStatus"),
  ALTER COLUMN "status" SET DEFAULT 'open';

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "IdeaRevision"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "IdeaRevisionStatus" USING ("status"::"IdeaRevisionStatus"),
  ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable (in place -- preserves existing row values, unlike a drop+add)
ALTER TABLE "Milestone"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "MilestoneStatus" USING ("status"::"MilestoneStatus"),
  ALTER COLUMN "status" SET DEFAULT 'pending';

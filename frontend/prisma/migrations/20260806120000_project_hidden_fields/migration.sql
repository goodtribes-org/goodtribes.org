-- AlterTable
-- Replace the self-serve public/private Project.visibility toggle with the
-- same hiddenAt/hiddenById/hiddenReason triad used by Idea/FeedPost/WikiPage
-- etc (see 20260717200000_idea_hidden_fields) — every project is now public
-- by default, hidden only via a deliberate site-admin moderation action.
ALTER TABLE "Project" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenById" TEXT,
ADD COLUMN     "hiddenReason" "ContentHideReason";

ALTER TABLE "Project" DROP COLUMN "visibility";

-- AlterTable
-- Same hiddenAt/hiddenById/hiddenReason triad as FeedPost/Message/etc (see
-- 20260715180000_content_flags) — lets an individual wiki page or academy
-- guide be moderation-hidden without touching the parent project's
-- visibility or the guide's own published/review workflow.
ALTER TABLE "WikiPage" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenById" TEXT,
ADD COLUMN     "hiddenReason" "ContentHideReason";

-- AlterTable
ALTER TABLE "AcademyGuide" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenById" TEXT,
ADD COLUMN     "hiddenReason" "ContentHideReason";

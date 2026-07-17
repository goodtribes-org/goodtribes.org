-- AlterTable
-- Same hiddenAt/hiddenById/hiddenReason triad as FeedPost/WikiPage/etc (see
-- 20260715180000_content_flags, 20260717190000_wiki_academy_hidden_fields) —
-- lets an individual idea be moderation-hidden via ContentFlag review.
ALTER TABLE "Idea" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenById" TEXT,
ADD COLUMN     "hiddenReason" "ContentHideReason";

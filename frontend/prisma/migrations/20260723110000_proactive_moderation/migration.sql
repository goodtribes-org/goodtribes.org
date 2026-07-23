-- PRD §12 point 4: proactive content moderation. System-generated
-- ContentFlag rows (no human reporter) and a new auto-hide reason.
ALTER TYPE "ContentHideReason" ADD VALUE 'AUTO_SPAM_DETECTED';

ALTER TABLE "ContentFlag" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'USER',
ALTER COLUMN "flaggedById" DROP NOT NULL;

-- CreateEnum
CREATE TYPE "FlagReason" AS ENUM ('SPAM', 'HARASSMENT', 'OFFENSIVE', 'OFF_TOPIC', 'OTHER');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('PENDING', 'ACTIONED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ContentHideReason" AS ENUM ('AUTO_FLAG_THRESHOLD', 'ADMIN_ACTION');

-- AlterTable
ALTER TABLE "DreamWallPost" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenById" TEXT,
ADD COLUMN     "hiddenReason" "ContentHideReason";

-- AlterTable
ALTER TABLE "FeedComment" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenById" TEXT,
ADD COLUMN     "hiddenReason" "ContentHideReason";

-- AlterTable
ALTER TABLE "FeedPost" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenById" TEXT,
ADD COLUMN     "hiddenReason" "ContentHideReason";

-- AlterTable
ALTER TABLE "IdeaComment" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenById" TEXT,
ADD COLUMN     "hiddenReason" "ContentHideReason";

-- AlterTable
ALTER TABLE "KanbanCardComment" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenById" TEXT,
ADD COLUMN     "hiddenReason" "ContentHideReason";

-- AlterTable
ALTER TABLE "LeanCanvasComment" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenById" TEXT,
ADD COLUMN     "hiddenReason" "ContentHideReason";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenById" TEXT,
ADD COLUMN     "hiddenReason" "ContentHideReason";

-- CreateTable
CREATE TABLE "ContentFlag" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "flaggedById" TEXT NOT NULL,
    "reason" "FlagReason" NOT NULL,
    "note" TEXT,
    "status" "FlagStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ContentFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentFlag_targetType_targetId_idx" ON "ContentFlag"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ContentFlag_status_idx" ON "ContentFlag"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ContentFlag_targetType_targetId_flaggedById_key" ON "ContentFlag"("targetType", "targetId", "flaggedById");

-- AddForeignKey
ALTER TABLE "ContentFlag" ADD CONSTRAINT "ContentFlag_flaggedById_fkey" FOREIGN KEY ("flaggedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentFlag" ADD CONSTRAINT "ContentFlag_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

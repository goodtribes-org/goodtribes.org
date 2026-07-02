/*
  Warnings:

  - You are about to drop the column `onboarded` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `ForumPost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ForumReply` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProjectMessage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ForumPost" DROP CONSTRAINT "ForumPost_authorId_fkey";

-- DropForeignKey
ALTER TABLE "ForumPost" DROP CONSTRAINT "ForumPost_projectSlug_fkey";

-- DropForeignKey
ALTER TABLE "ForumReply" DROP CONSTRAINT "ForumReply_authorId_fkey";

-- DropForeignKey
ALTER TABLE "ForumReply" DROP CONSTRAINT "ForumReply_parentId_fkey";

-- DropForeignKey
ALTER TABLE "ForumReply" DROP CONSTRAINT "ForumReply_postId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectMessage" DROP CONSTRAINT "ProjectMessage_authorId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectMessage" DROP CONSTRAINT "ProjectMessage_projectId_fkey";

-- DropIndex
DROP INDEX "ActivityEvent_projectId_createdAt_idx";

-- AlterTable
ALTER TABLE "FundingCampaign" ADD COLUMN     "campaignType" TEXT NOT NULL DEFAULT 'donation',
ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 5,
ADD COLUMN     "stripeAccountId" TEXT;

-- AlterTable
ALTER TABLE "FundingPledge" ADD COLUMN     "pledgeStatus" TEXT NOT NULL DEFAULT 'confirmed',
ADD COLUMN     "rewardTierId" TEXT,
ADD COLUMN     "stripeSessionId" TEXT;

-- AlterTable
ALTER TABLE "Idea" ADD COLUMN     "category" TEXT,
ADD COLUMN     "estimatedReach" INTEGER,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "problem" TEXT,
ADD COLUMN     "solution" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'open',
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "targetRegion" TEXT NOT NULL DEFAULT 'global',
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "sdgGoals" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "KanbanCardComment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Milestone" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS    "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS    "openForReplication" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "sdgGoals" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "tags" DROP DEFAULT;

-- AlterTable
-- NOTE: hand-edited from Prisma's generated DROP+ADD to a RENAME to preserve existing onboarding data.
ALTER TABLE "User" RENAME COLUMN "onboarded" TO "onboardingDone";
ALTER TABLE "User" ALTER COLUMN "onboardingDone" SET DEFAULT false;

-- AlterTable
ALTER TABLE "WikiPage" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "ForumPost";

-- DropTable
DROP TABLE "ForumReply";

-- DropTable
DROP TABLE "ProjectMessage";

-- CreateTable
CREATE TABLE "IdeaEndorsement" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaEndorsement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaFollower" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaFollower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'yes_no',
    "status" TEXT NOT NULL DEFAULT 'open',
    "visibility" TEXT NOT NULL DEFAULT 'live',
    "isBinding" BOOLEAN NOT NULL DEFAULT false,
    "quorumPercent" DOUBLE PRECISION,
    "deadline" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "pollOptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenWeight" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingRewardTier" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "minAmount" INTEGER NOT NULL,
    "maxBackers" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundingRewardTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingExpense" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "receiptUrl" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundingExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactMetric" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImpactMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactUpdate" (
    "id" TEXT NOT NULL,
    "impactMetricId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpactUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMaturity" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreBreakdown" JSONB,
    "scaleInitiatedAt" TIMESTAMP(3),
    "scalingPlan" TEXT,
    "finalReport" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMaturity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectInstance" (
    "id" TEXT NOT NULL,
    "parentSlug" TEXT NOT NULL,
    "childSlug" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAlumni" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokensEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "badgeIssuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalReport" TEXT,

    CONSTRAINT "ProjectAlumni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mentor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categories" TEXT[],
    "bio" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mentor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorshipRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "sessionAt" TIMESTAMP(3),
    "tokensAwarded" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorshipRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorshipFeedback" (
    "id" TEXT NOT NULL,
    "mentorshipRequestId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorshipFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyGuide" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'beginner',
    "readTimeMinutes" INTEGER NOT NULL DEFAULT 5,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGuideCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGuideCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kudos" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "projectId" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kudos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "currentWeeks" INTEGER NOT NULL DEFAULT 0,
    "longestWeeks" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DreamWallPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dreamText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DreamWallPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DreamWallReaction" (
    "id" TEXT NOT NULL,
    "dreamWallPostId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DreamWallReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectFlag" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "flaggedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EthicsReview" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "projectFlagId" TEXT,
    "outcome" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EthicsReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'text',
    "order" INTEGER NOT NULL DEFAULT 0,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelMessage" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "threadParentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelMessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelMessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelReadMarker" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelReadMarker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdeaEndorsement_ideaId_userId_key" ON "IdeaEndorsement"("ideaId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "IdeaFollower_ideaId_userId_key" ON "IdeaFollower"("ideaId", "userId");

-- CreateIndex
CREATE INDEX "Poll_projectSlug_idx" ON "Poll"("projectSlug");

-- CreateIndex
CREATE INDEX "PollVote_pollId_userId_idx" ON "PollVote"("pollId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PollVote_pollId_pollOptionId_userId_key" ON "PollVote"("pollId", "pollOptionId", "userId");

-- CreateIndex
CREATE INDEX "FundingRewardTier_campaignId_idx" ON "FundingRewardTier"("campaignId");

-- CreateIndex
CREATE INDEX "FundingExpense_campaignId_idx" ON "FundingExpense"("campaignId");

-- CreateIndex
CREATE INDEX "ImpactMetric_projectSlug_idx" ON "ImpactMetric"("projectSlug");

-- CreateIndex
CREATE INDEX "ImpactUpdate_impactMetricId_idx" ON "ImpactUpdate"("impactMetricId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMaturity_projectSlug_key" ON "ProjectMaturity"("projectSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInstance_childSlug_key" ON "ProjectInstance"("childSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInstance_parentSlug_childSlug_key" ON "ProjectInstance"("parentSlug", "childSlug");

-- CreateIndex
CREATE INDEX "ProjectAlumni_projectSlug_idx" ON "ProjectAlumni"("projectSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAlumni_projectSlug_userId_key" ON "ProjectAlumni"("projectSlug", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Mentor_userId_key" ON "Mentor"("userId");

-- CreateIndex
CREATE INDEX "MentorshipRequest_projectId_idx" ON "MentorshipRequest"("projectId");

-- CreateIndex
CREATE INDEX "MentorshipRequest_mentorId_idx" ON "MentorshipRequest"("mentorId");

-- CreateIndex
CREATE UNIQUE INDEX "MentorshipFeedback_mentorshipRequestId_key" ON "MentorshipFeedback"("mentorshipRequestId");

-- CreateIndex
CREATE INDEX "AcademyGuide_category_idx" ON "AcademyGuide"("category");

-- CreateIndex
CREATE UNIQUE INDEX "UserGuideCompletion_userId_guideId_key" ON "UserGuideCompletion"("userId", "guideId");

-- CreateIndex
CREATE INDEX "Kudos_toUserId_idx" ON "Kudos"("toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserStreak_userId_projectId_key" ON "UserStreak"("userId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "DreamWallReaction_dreamWallPostId_userId_emoji_key" ON "DreamWallReaction"("dreamWallPostId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "ProjectFlag_projectId_idx" ON "ProjectFlag"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "EthicsReview_projectFlagId_key" ON "EthicsReview"("projectFlagId");

-- CreateIndex
CREATE INDEX "EthicsReview_projectId_idx" ON "EthicsReview"("projectId");

-- CreateIndex
CREATE INDEX "Channel_projectId_idx" ON "Channel"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_projectId_name_key" ON "Channel"("projectId", "name");

-- CreateIndex
CREATE INDEX "ChannelMessage_channelId_createdAt_idx" ON "ChannelMessage"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "ChannelMessage_threadParentId_idx" ON "ChannelMessage"("threadParentId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelMessageReaction_messageId_userId_emoji_key" ON "ChannelMessageReaction"("messageId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "ChannelReadMarker_userId_idx" ON "ChannelReadMarker"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelReadMarker_channelId_userId_key" ON "ChannelReadMarker"("channelId", "userId");

-- AddForeignKey
ALTER TABLE "IdeaEndorsement" ADD CONSTRAINT "IdeaEndorsement_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaEndorsement" ADD CONSTRAINT "IdeaEndorsement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaFollower" ADD CONSTRAINT "IdeaFollower_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaFollower" ADD CONSTRAINT "IdeaFollower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingPledge" ADD CONSTRAINT "FundingPledge_rewardTierId_fkey" FOREIGN KEY ("rewardTierId") REFERENCES "FundingRewardTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollOptionId_fkey" FOREIGN KEY ("pollOptionId") REFERENCES "PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingRewardTier" ADD CONSTRAINT "FundingRewardTier_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "FundingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingExpense" ADD CONSTRAINT "FundingExpense_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "FundingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactMetric" ADD CONSTRAINT "ImpactMetric_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactUpdate" ADD CONSTRAINT "ImpactUpdate_impactMetricId_fkey" FOREIGN KEY ("impactMetricId") REFERENCES "ImpactMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactUpdate" ADD CONSTRAINT "ImpactUpdate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMaturity" ADD CONSTRAINT "ProjectMaturity_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInstance" ADD CONSTRAINT "ProjectInstance_parentSlug_fkey" FOREIGN KEY ("parentSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInstance" ADD CONSTRAINT "ProjectInstance_childSlug_fkey" FOREIGN KEY ("childSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInstance" ADD CONSTRAINT "ProjectInstance_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAlumni" ADD CONSTRAINT "ProjectAlumni_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAlumni" ADD CONSTRAINT "ProjectAlumni_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentor" ADD CONSTRAINT "Mentor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipRequest" ADD CONSTRAINT "MentorshipRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipRequest" ADD CONSTRAINT "MentorshipRequest_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipFeedback" ADD CONSTRAINT "MentorshipFeedback_mentorshipRequestId_fkey" FOREIGN KEY ("mentorshipRequestId") REFERENCES "MentorshipRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyGuide" ADD CONSTRAINT "AcademyGuide_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyGuide" ADD CONSTRAINT "AcademyGuide_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGuideCompletion" ADD CONSTRAINT "UserGuideCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGuideCompletion" ADD CONSTRAINT "UserGuideCompletion_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "AcademyGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kudos" ADD CONSTRAINT "Kudos_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kudos" ADD CONSTRAINT "Kudos_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kudos" ADD CONSTRAINT "Kudos_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStreak" ADD CONSTRAINT "UserStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStreak" ADD CONSTRAINT "UserStreak_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DreamWallPost" ADD CONSTRAINT "DreamWallPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DreamWallReaction" ADD CONSTRAINT "DreamWallReaction_dreamWallPostId_fkey" FOREIGN KEY ("dreamWallPostId") REFERENCES "DreamWallPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DreamWallReaction" ADD CONSTRAINT "DreamWallReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFlag" ADD CONSTRAINT "ProjectFlag_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFlag" ADD CONSTRAINT "ProjectFlag_flaggedById_fkey" FOREIGN KEY ("flaggedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFlag" ADD CONSTRAINT "ProjectFlag_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EthicsReview" ADD CONSTRAINT "EthicsReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EthicsReview" ADD CONSTRAINT "EthicsReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EthicsReview" ADD CONSTRAINT "EthicsReview_projectFlagId_fkey" FOREIGN KEY ("projectFlagId") REFERENCES "ProjectFlag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessage" ADD CONSTRAINT "ChannelMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessage" ADD CONSTRAINT "ChannelMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessage" ADD CONSTRAINT "ChannelMessage_threadParentId_fkey" FOREIGN KEY ("threadParentId") REFERENCES "ChannelMessage"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ChannelMessageReaction" ADD CONSTRAINT "ChannelMessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChannelMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessageReaction" ADD CONSTRAINT "ChannelMessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelReadMarker" ADD CONSTRAINT "ChannelReadMarker_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelReadMarker" ADD CONSTRAINT "ChannelReadMarker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

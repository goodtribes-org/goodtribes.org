-- CreateEnum
CREATE TYPE "MarketScanEntryType" AS ENUM ('COMPETITOR', 'TREND', 'PARTNER_PROSPECT', 'REGULATION');

-- CreateEnum
CREATE TYPE "ChannelPlanStatus" AS ENUM ('PLANNED', 'ACTIVE', 'DONE');

-- CreateTable
CREATE TABLE "InterviewLogEntry" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "personaName" TEXT NOT NULL,
    "painPoint" TEXT NOT NULL,
    "validated" BOOLEAN NOT NULL,
    "quotes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketScanEntry" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "type" "MarketScanEntryType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "relevanceNote" TEXT,
    "sourceUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketScanEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaunchPlan" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "targetAudience" TEXT,
    "positioning" TEXT,
    "budgetOverview" TEXT,
    "successMetrics" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaunchPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaunchPlanChannel" (
    "id" TEXT NOT NULL,
    "launchPlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tactic" TEXT,
    "owner" TEXT,
    "budget" TEXT,
    "plannedDate" TIMESTAMP(3),
    "status" "ChannelPlanStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaunchPlanChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaunchPlanMilestone" (
    "id" TEXT NOT NULL,
    "launchPlanId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaunchPlanMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewLogEntry_projectSlug_idx" ON "InterviewLogEntry"("projectSlug");

-- CreateIndex
CREATE INDEX "MarketScanEntry_projectSlug_idx" ON "MarketScanEntry"("projectSlug");

-- CreateIndex
CREATE UNIQUE INDEX "LaunchPlan_projectSlug_key" ON "LaunchPlan"("projectSlug");

-- CreateIndex
CREATE INDEX "LaunchPlanChannel_launchPlanId_idx" ON "LaunchPlanChannel"("launchPlanId");

-- CreateIndex
CREATE INDEX "LaunchPlanMilestone_launchPlanId_idx" ON "LaunchPlanMilestone"("launchPlanId");

-- AddForeignKey
ALTER TABLE "InterviewLogEntry" ADD CONSTRAINT "InterviewLogEntry_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewLogEntry" ADD CONSTRAINT "InterviewLogEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketScanEntry" ADD CONSTRAINT "MarketScanEntry_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketScanEntry" ADD CONSTRAINT "MarketScanEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaunchPlan" ADD CONSTRAINT "LaunchPlan_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaunchPlan" ADD CONSTRAINT "LaunchPlan_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaunchPlanChannel" ADD CONSTRAINT "LaunchPlanChannel_launchPlanId_fkey" FOREIGN KEY ("launchPlanId") REFERENCES "LaunchPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaunchPlanMilestone" ADD CONSTRAINT "LaunchPlanMilestone_launchPlanId_fkey" FOREIGN KEY ("launchPlanId") REFERENCES "LaunchPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;


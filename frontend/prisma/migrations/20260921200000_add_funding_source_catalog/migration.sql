-- CreateEnum
CREATE TYPE "FundingSourceCategory" AS ENUM ('FOUNDATION', 'GOVERNMENT_GRANT', 'EU_PROGRAM', 'CORPORATE_CSR', 'OTHER');

-- CreateEnum
CREATE TYPE "FundingSourceStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FundingApplicationStatus" AS ENUM ('draft', 'ai_drafted', 'ready_for_review', 'submitted', 'awarded', 'rejected', 'withdrawn');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "estimatedFundingNeedSek" INTEGER;

-- CreateTable
CREATE TABLE "FundingSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT,
    "description" TEXT,
    "category" "FundingSourceCategory" NOT NULL DEFAULT 'OTHER',
    "sdgGoals" INTEGER[],
    "eligibleLegalTypes" "LegalType"[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minAmountSek" INTEGER,
    "maxAmountSek" INTEGER,
    "applicationUrl" TEXT,
    "hasApiIntegration" BOOLEAN NOT NULL DEFAULT false,
    "requiresBankId" BOOLEAN NOT NULL DEFAULT true,
    "region" TEXT,
    "rollingDeadline" BOOLEAN NOT NULL DEFAULT false,
    "nextDeadline" TIMESTAMP(3),
    "status" "FundingSourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundingSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingMatch" (
    "id" TEXT NOT NULL,
    "fundingSourceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "dismissedById" TEXT,

    CONSTRAINT "FundingMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingApplication" (
    "id" TEXT NOT NULL,
    "fundingSourceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "FundingApplicationStatus" NOT NULL DEFAULT 'draft',
    "amountRequestedSek" INTEGER,
    "deadline" TIMESTAMP(3),
    "draftMarkdown" TEXT,
    "draftGeneratedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "outcomeAmountSek" INTEGER,
    "outcomeNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "deadlineEscalationStage" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundingApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FundingSource_status_idx" ON "FundingSource"("status");

-- CreateIndex
CREATE INDEX "FundingMatch_projectId_idx" ON "FundingMatch"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "FundingMatch_fundingSourceId_projectId_key" ON "FundingMatch"("fundingSourceId", "projectId");

-- CreateIndex
CREATE INDEX "FundingApplication_projectId_idx" ON "FundingApplication"("projectId");

-- CreateIndex
CREATE INDEX "FundingApplication_fundingSourceId_idx" ON "FundingApplication"("fundingSourceId");

-- CreateIndex
CREATE INDEX "FundingApplication_deadline_idx" ON "FundingApplication"("deadline");

-- AddForeignKey
ALTER TABLE "FundingSource" ADD CONSTRAINT "FundingSource_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingMatch" ADD CONSTRAINT "FundingMatch_fundingSourceId_fkey" FOREIGN KEY ("fundingSourceId") REFERENCES "FundingSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingMatch" ADD CONSTRAINT "FundingMatch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingApplication" ADD CONSTRAINT "FundingApplication_fundingSourceId_fkey" FOREIGN KEY ("fundingSourceId") REFERENCES "FundingSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingApplication" ADD CONSTRAINT "FundingApplication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;


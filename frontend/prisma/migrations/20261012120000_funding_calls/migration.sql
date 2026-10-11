-- Utlysningar (#343): additive only — new enums, FundingSource.adapter/lastFetchedAt, new FundingCall table.
-- CreateEnum
CREATE TYPE "FundingCallAdapter" AS ENUM ('MANUAL', 'VINNOVA', 'GDP_FORMAS');
-- CreateEnum
CREATE TYPE "FundingCallStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
-- CreateEnum
CREATE TYPE "FundingApplicantType" AS ENUM ('COMPANY', 'NONPROFIT', 'UNIVERSITY', 'MUNICIPALITY', 'PUBLIC_AGENCY', 'CONSORTIUM', 'INDIVIDUAL', 'OTHER');
-- AlterTable
ALTER TABLE "FundingSource" ADD COLUMN     "adapter" "FundingCallAdapter" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "lastFetchedAt" TIMESTAMP(3);
-- CreateTable
CREATE TABLE "FundingCall" (
    "id" TEXT NOT NULL,
    "fundingSourceId" TEXT NOT NULL,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "url" TEXT,
    "applyUrl" TEXT,
    "sourceDescription" TEXT,
    "eligibilityText" TEXT,
    "amountText" TEXT,
    "opensAt" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "rolling" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT,
    "applicantTypes" "FundingApplicantType"[],
    "amountMinSek" INTEGER,
    "amountMaxSek" INTEGER,
    "totalBudgetSek" INTEGER,
    "cofunding" TEXT,
    "projectStart" TIMESTAMP(3),
    "projectLengthMonths" INTEGER,
    "sdgGoals" INTEGER[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stateAidRule" TEXT,
    "provenance" JSONB,
    "status" "FundingCallStatus" NOT NULL DEFAULT 'DRAFT',
    "contentHash" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "changedAt" TIMESTAMP(3),
    "aiSuggestedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FundingCall_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "FundingCall_status_deadline_idx" ON "FundingCall"("status", "deadline");
-- CreateIndex
CREATE UNIQUE INDEX "FundingCall_fundingSourceId_externalId_key" ON "FundingCall"("fundingSourceId", "externalId");
-- AddForeignKey
ALTER TABLE "FundingCall" ADD CONSTRAINT "FundingCall_fundingSourceId_fkey" FOREIGN KEY ("fundingSourceId") REFERENCES "FundingSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

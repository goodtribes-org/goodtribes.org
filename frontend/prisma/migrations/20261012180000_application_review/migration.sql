-- Utlysningar (#346): additive only — GoodTribes entity fields on CommercialUmbrellaEntity (existing rows stay LIMITED_COMPANY/EXISTS, the umbrella ABs they are), three new FundingApplicationStatus values, call/entity/checklist columns on FundingApplication, and the ApplicationReview and _EntityReviewers tables.
-- CreateEnum
CREATE TYPE "ApplicationReviewLevel" AS ENUM ('CHECK', 'IDENTITY', 'HUMAN');
-- CreateEnum
CREATE TYPE "ApplicationReviewResult" AS ENUM ('OK', 'CHANGES', 'REJECTED');
-- CreateEnum
CREATE TYPE "GoodTribesEntityKind" AS ENUM ('LIMITED_COMPANY', 'FOUNDATION', 'NONPROFIT', 'PARTNER');
-- CreateEnum
CREATE TYPE "GoodTribesEntityStatus" AS ENUM ('PLANNED', 'EXISTS', 'OPEN_QUESTION');
-- AlterEnum
ALTER TYPE "FundingApplicationStatus" ADD VALUE 'in_review';
ALTER TYPE "FundingApplicationStatus" ADD VALUE 'changes_requested';
ALTER TYPE "FundingApplicationStatus" ADD VALUE 'approved';
ALTER TYPE "FundingApplicationStatus" ADD VALUE 'review_rejected';
-- AlterTable
ALTER TABLE "FundingApplication" ADD COLUMN     "applicantEntityId" TEXT,
ADD COLUMN     "cofundingNote" TEXT,
ADD COLUMN     "fundingCallId" TEXT,
ADD COLUMN     "requirementsDone" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "reviewRequestedAt" TIMESTAMP(3);
-- AlterTable
ALTER TABLE "CommercialUmbrellaEntity" ADD COLUMN     "applicantTypes" "FundingApplicantType"[],
ADD COLUMN     "kind" "GoodTribesEntityKind" NOT NULL DEFAULT 'LIMITED_COMPANY',
ADD COLUMN     "signatoryEmail" TEXT,
ADD COLUMN     "signatoryName" TEXT,
ADD COLUMN     "status" "GoodTribesEntityStatus" NOT NULL DEFAULT 'EXISTS';
-- CreateTable
CREATE TABLE "ApplicationReview" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "level" "ApplicationReviewLevel" NOT NULL,
    "result" "ApplicationReviewResult" NOT NULL,
    "motivation" TEXT,
    "findings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApplicationReview_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "_EntityReviewers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_EntityReviewers_AB_pkey" PRIMARY KEY ("A","B")
);
-- CreateIndex
CREATE INDEX "ApplicationReview_applicationId_idx" ON "ApplicationReview"("applicationId");
-- CreateIndex
CREATE INDEX "_EntityReviewers_B_index" ON "_EntityReviewers"("B");
-- AddForeignKey
ALTER TABLE "FundingApplication" ADD CONSTRAINT "FundingApplication_fundingCallId_fkey" FOREIGN KEY ("fundingCallId") REFERENCES "FundingCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "FundingApplication" ADD CONSTRAINT "FundingApplication_applicantEntityId_fkey" FOREIGN KEY ("applicantEntityId") REFERENCES "CommercialUmbrellaEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ApplicationReview" ADD CONSTRAINT "ApplicationReview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "FundingApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ApplicationReview" ADD CONSTRAINT "ApplicationReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "_EntityReviewers" ADD CONSTRAINT "_EntityReviewers_A_fkey" FOREIGN KEY ("A") REFERENCES "CommercialUmbrellaEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "_EntityReviewers" ADD CONSTRAINT "_EntityReviewers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

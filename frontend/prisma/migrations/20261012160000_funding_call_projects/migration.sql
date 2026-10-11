-- Utlysningar (#345): additive only — Project.fundingCallId/fundingCallReminderStage and the FundingCallMatch table.
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "fundingCallId" TEXT,
ADD COLUMN     "fundingCallReminderStage" INTEGER NOT NULL DEFAULT 0;
-- CreateTable
CREATE TABLE "FundingCallMatch" (
    "id" TEXT NOT NULL,
    "fundingCallId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "dismissedById" TEXT,
    CONSTRAINT "FundingCallMatch_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "FundingCallMatch_projectId_idx" ON "FundingCallMatch"("projectId");
-- CreateIndex
CREATE UNIQUE INDEX "FundingCallMatch_fundingCallId_projectId_key" ON "FundingCallMatch"("fundingCallId", "projectId");
-- CreateIndex
CREATE INDEX "Project_fundingCallId_idx" ON "Project"("fundingCallId");
-- AddForeignKey
ALTER TABLE "FundingCallMatch" ADD CONSTRAINT "FundingCallMatch_fundingCallId_fkey" FOREIGN KEY ("fundingCallId") REFERENCES "FundingCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "FundingCallMatch" ADD CONSTRAINT "FundingCallMatch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_fundingCallId_fkey" FOREIGN KEY ("fundingCallId") REFERENCES "FundingCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

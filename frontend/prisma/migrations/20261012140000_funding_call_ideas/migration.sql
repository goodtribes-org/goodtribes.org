-- Utlysningar (#344): additive only — FundingCall.slug and Idea.fundingCallId.
-- AlterTable
ALTER TABLE "FundingCall" ADD COLUMN     "slug" TEXT;
-- AlterTable
ALTER TABLE "Idea" ADD COLUMN     "fundingCallId" TEXT;
-- CreateIndex
CREATE UNIQUE INDEX "FundingCall_slug_key" ON "FundingCall"("slug");
-- CreateIndex
CREATE INDEX "Idea_fundingCallId_idx" ON "Idea"("fundingCallId");
-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_fundingCallId_fkey" FOREIGN KEY ("fundingCallId") REFERENCES "FundingCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

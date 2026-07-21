-- DropIndex
DROP INDEX "FundingPledge_campaignId_userId_key";

-- AlterTable
ALTER TABLE "FundingCampaign" ADD COLUMN     "stripeOnboardingStatus" TEXT NOT NULL DEFAULT 'not_started',
ADD COLUMN     "tokenExchangeRate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "FundingExpense" ADD COLUMN     "milestoneId" TEXT;

-- AlterTable
ALTER TABLE "FundingPledge" ADD COLUMN     "paymentMethodType" TEXT,
ADD COLUMN     "tokenLedgerId" TEXT;

-- CreateIndex
CREATE INDEX "FundingExpense_milestoneId_idx" ON "FundingExpense"("milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "FundingPledge_stripeSessionId_key" ON "FundingPledge"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "FundingPledge_tokenLedgerId_key" ON "FundingPledge"("tokenLedgerId");

-- CreateIndex
CREATE INDEX "FundingPledge_campaignId_userId_idx" ON "FundingPledge"("campaignId", "userId");

-- AddForeignKey
ALTER TABLE "FundingPledge" ADD CONSTRAINT "FundingPledge_tokenLedgerId_fkey" FOREIGN KEY ("tokenLedgerId") REFERENCES "TokenLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingExpense" ADD CONSTRAINT "FundingExpense_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

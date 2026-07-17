-- AlterEnum
-- New FlagReason values covering what ProjectFlag/OrganisationFlag's free-text
-- reasons used, ahead of routing their flagging through ContentFlag.
ALTER TYPE "FlagReason" ADD VALUE 'FRAUD';
ALTER TYPE "FlagReason" ADD VALUE 'ETHICS_VIOLATION';

-- AlterTable
-- Nullable link so new ethics reviews created off the unified ContentFlag
-- pipeline can be traced back to their flag, alongside the existing
-- projectFlagId/organisationFlagId used by the legacy flag flow.
ALTER TABLE "EthicsReview" ADD COLUMN     "contentFlagId" TEXT;

-- AlterTable
ALTER TABLE "OrganisationEthicsReview" ADD COLUMN     "contentFlagId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EthicsReview_contentFlagId_key" ON "EthicsReview"("contentFlagId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationEthicsReview_contentFlagId_key" ON "OrganisationEthicsReview"("contentFlagId");

-- AddForeignKey
ALTER TABLE "EthicsReview" ADD CONSTRAINT "EthicsReview_contentFlagId_fkey" FOREIGN KEY ("contentFlagId") REFERENCES "ContentFlag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationEthicsReview" ADD CONSTRAINT "OrganisationEthicsReview_contentFlagId_fkey" FOREIGN KEY ("contentFlagId") REFERENCES "ContentFlag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

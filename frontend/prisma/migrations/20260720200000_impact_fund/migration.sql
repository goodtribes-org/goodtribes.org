-- AlterTable
ALTER TABLE "PlatformPollOption" ADD COLUMN     "linkedProjectId" TEXT;

-- CreateTable
CREATE TABLE "ProfitDistributionProposal" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "auditedProfitSek" INTEGER NOT NULL,
    "proposedOperationsPct" DOUBLE PRECISION NOT NULL,
    "proposedImpactFundPct" DOUBLE PRECISION NOT NULL,
    "pollId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "proposedById" TEXT NOT NULL,
    "decisionNote" TEXT,
    "executedById" TEXT,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfitDistributionProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitDistribution" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "auditedProfitSek" INTEGER NOT NULL,
    "operationsShareSek" INTEGER NOT NULL,
    "impactFundShareSek" INTEGER NOT NULL,
    "remainingShareSek" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfitDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalProfitAllocation" (
    "id" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountAvailableSek" INTEGER NOT NULL,
    "allocationDeadline" TIMESTAMP(3) NOT NULL,
    "targetProjectSlug" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalProfitAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactFundLedger" (
    "id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amountSek" INTEGER NOT NULL,
    "relatedDistributionId" TEXT,
    "relatedAllocationId" TEXT,
    "targetProjectId" TEXT,
    "decidedByPollId" TEXT,
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpactFundLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactFundAllocationRound" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "openedById" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpactFundAllocationRound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfitDistributionProposal_projectId_idx" ON "ProfitDistributionProposal"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfitDistribution_proposalId_key" ON "ProfitDistribution"("proposalId");

-- CreateIndex
CREATE INDEX "ProfitDistribution_projectId_idx" ON "ProfitDistribution"("projectId");

-- CreateIndex
CREATE INDEX "PersonalProfitAllocation_userId_idx" ON "PersonalProfitAllocation"("userId");

-- CreateIndex
CREATE INDEX "PersonalProfitAllocation_distributionId_idx" ON "PersonalProfitAllocation"("distributionId");

-- CreateIndex
CREATE UNIQUE INDEX "ImpactFundAllocationRound_pollId_key" ON "ImpactFundAllocationRound"("pollId");

-- AddForeignKey
ALTER TABLE "ProfitDistributionProposal" ADD CONSTRAINT "ProfitDistributionProposal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitDistributionProposal" ADD CONSTRAINT "ProfitDistributionProposal_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitDistributionProposal" ADD CONSTRAINT "ProfitDistributionProposal_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitDistribution" ADD CONSTRAINT "ProfitDistribution_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ProfitDistributionProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitDistribution" ADD CONSTRAINT "ProfitDistribution_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalProfitAllocation" ADD CONSTRAINT "PersonalProfitAllocation_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "ProfitDistribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalProfitAllocation" ADD CONSTRAINT "PersonalProfitAllocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactFundLedger" ADD CONSTRAINT "ImpactFundLedger_targetProjectId_fkey" FOREIGN KEY ("targetProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactFundLedger" ADD CONSTRAINT "ImpactFundLedger_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactFundAllocationRound" ADD CONSTRAINT "ImpactFundAllocationRound_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPollOption" ADD CONSTRAINT "PlatformPollOption_linkedProjectId_fkey" FOREIGN KEY ("linkedProjectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

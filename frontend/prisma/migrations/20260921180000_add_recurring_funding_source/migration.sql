-- CreateEnum
CREATE TYPE "RecurringFundingType" AS ENUM ('MEMBERSHIP_FEES', 'GRANT', 'SUBSCRIPTION', 'REVENUE_SHARE', 'OTHER');

-- CreateEnum
CREATE TYPE "RecurringFundingInterval" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY', 'OTHER');

-- CreateTable
CREATE TABLE "RecurringFundingSource" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "RecurringFundingType" NOT NULL DEFAULT 'OTHER',
    "label" TEXT NOT NULL,
    "sourceName" TEXT,
    "amountSek" INTEGER NOT NULL,
    "interval" "RecurringFundingInterval" NOT NULL DEFAULT 'MONTHLY',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringFundingSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringFundingSource_projectId_idx" ON "RecurringFundingSource"("projectId");

-- AddForeignKey
ALTER TABLE "RecurringFundingSource" ADD CONSTRAINT "RecurringFundingSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringFundingSource" ADD CONSTRAINT "RecurringFundingSource_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringFundingSource" ADD CONSTRAINT "RecurringFundingSource_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


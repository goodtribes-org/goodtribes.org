-- CreateEnum
CREATE TYPE "RoomOrigin" AS ENUM ('HUMAN', 'AI_SEED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "forkedFromProjectId" TEXT,
ADD COLUMN     "forkedFromSandboxThreadId" TEXT;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "isSandbox" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "origin" "RoomOrigin" NOT NULL DEFAULT 'HUMAN';

-- CreateTable
CREATE TABLE "ForkContributorCredit" (
    "id" TEXT NOT NULL,
    "forkedProjectId" TEXT NOT NULL,
    "originalProjectId" TEXT,
    "creditedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForkContributorCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForkProfitShare" (
    "id" TEXT NOT NULL,
    "forkedProjectId" TEXT NOT NULL,
    "originalProjectId" TEXT NOT NULL,
    "originalContributorUserId" TEXT NOT NULL,
    "sharePercent" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForkProfitShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForkTokenGrant" (
    "id" TEXT NOT NULL,
    "forkedProjectId" TEXT NOT NULL,
    "originalProjectId" TEXT NOT NULL,
    "originalContributorUserId" TEXT NOT NULL,
    "tribeTokensGranted" DOUBLE PRECISION NOT NULL,
    "grantedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForkTokenGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ForkContributorCredit_forkedProjectId_idx" ON "ForkContributorCredit"("forkedProjectId");

-- CreateIndex
CREATE INDEX "ForkProfitShare_forkedProjectId_idx" ON "ForkProfitShare"("forkedProjectId");

-- CreateIndex
CREATE INDEX "ForkTokenGrant_forkedProjectId_idx" ON "ForkTokenGrant"("forkedProjectId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_forkedFromProjectId_fkey" FOREIGN KEY ("forkedFromProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_forkedFromSandboxThreadId_fkey" FOREIGN KEY ("forkedFromSandboxThreadId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForkContributorCredit" ADD CONSTRAINT "ForkContributorCredit_forkedProjectId_fkey" FOREIGN KEY ("forkedProjectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForkContributorCredit" ADD CONSTRAINT "ForkContributorCredit_creditedUserId_fkey" FOREIGN KEY ("creditedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForkProfitShare" ADD CONSTRAINT "ForkProfitShare_forkedProjectId_fkey" FOREIGN KEY ("forkedProjectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForkProfitShare" ADD CONSTRAINT "ForkProfitShare_originalProjectId_fkey" FOREIGN KEY ("originalProjectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForkProfitShare" ADD CONSTRAINT "ForkProfitShare_originalContributorUserId_fkey" FOREIGN KEY ("originalContributorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForkTokenGrant" ADD CONSTRAINT "ForkTokenGrant_forkedProjectId_fkey" FOREIGN KEY ("forkedProjectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForkTokenGrant" ADD CONSTRAINT "ForkTokenGrant_originalContributorUserId_fkey" FOREIGN KEY ("originalContributorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForkTokenGrant" ADD CONSTRAINT "ForkTokenGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

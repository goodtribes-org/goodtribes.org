-- Assumptions as the spine of the Idé phase (docs/plans/ide-iteration.md).
-- Additive only: three new enums and one new table, nothing existing is
-- altered. Generated with `prisma migrate diff` against a throwaway shadow
-- database; the TimeLog drop that diff always proposes was stripped out
-- (intentionally orphaned table, see CLAUDE.md Known issues).

-- CreateEnum
CREATE TYPE "AssumptionRisk" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "AssumptionStatus" AS ENUM ('UNTESTED', 'TESTING', 'SUPPORTED', 'REFUTED');

-- CreateEnum
CREATE TYPE "AssumptionOrigin" AS ENUM ('USER', 'AI', 'CRITIQUE', 'INTERVIEW');

-- CreateTable
CREATE TABLE "Assumption" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sourceEntity" TEXT,
    "sourceField" TEXT,
    "risk" "AssumptionRisk" NOT NULL DEFAULT 'MEDIUM',
    "status" "AssumptionStatus" NOT NULL DEFAULT 'UNTESTED',
    "testPlan" TEXT,
    "evidence" TEXT,
    "origin" "AssumptionOrigin" NOT NULL DEFAULT 'USER',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assumption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Assumption_projectId_status_idx" ON "Assumption"("projectId", "status");

-- AddForeignKey
ALTER TABLE "Assumption" ADD CONSTRAINT "Assumption_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "SprintStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SprintPace" AS ENUM ('TOGETHER', 'SPREAD_OUT');

-- CreateEnum
CREATE TYPE "SprintPhaseName" AS ENUM ('UNDERSTAND', 'DIVERGE', 'DECIDE', 'PROTOTYPE', 'VALIDATE');

-- CreateEnum
CREATE TYPE "SprintPhaseStatus" AS ENUM ('OPEN', 'CLOSED', 'LOCKED');

-- CreateEnum
CREATE TYPE "SprintContributionType" AS ENUM ('HMW', 'SKETCH', 'PROTOTYPE_LINK', 'FEEDBACK');

-- CreateTable
CREATE TABLE "Sprint" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SprintStatus" NOT NULL DEFAULT 'ACTIVE',
    "pace" "SprintPace" NOT NULL DEFAULT 'SPREAD_OUT',
    "phaseDurationDays" INTEGER,
    "currentPhase" "SprintPhaseName" NOT NULL DEFAULT 'UNDERSTAND',
    "aiSummaryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SprintPhase" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "phase" "SprintPhaseName" NOT NULL,
    "status" "SprintPhaseStatus" NOT NULL DEFAULT 'LOCKED',
    "openedAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "documentState" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "aiSummary" TEXT,
    CONSTRAINT "SprintPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SprintContribution" (
    "id" TEXT NOT NULL,
    "sprintPhaseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "SprintContributionType" NOT NULL,
    "content" TEXT NOT NULL,
    "visibleAuthor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SprintContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SprintVote" (
    "id" TEXT NOT NULL,
    "sprintPhaseId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "contributionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SprintVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SprintComment" (
    "id" TEXT NOT NULL,
    "contributionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SprintComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sprint_projectSlug_idx" ON "Sprint"("projectSlug");

-- CreateIndex
CREATE UNIQUE INDEX "SprintPhase_sprintId_phase_key" ON "SprintPhase"("sprintId", "phase");

-- CreateIndex
CREATE INDEX "SprintPhase_sprintId_idx" ON "SprintPhase"("sprintId");

-- CreateIndex
CREATE INDEX "SprintContribution_sprintPhaseId_idx" ON "SprintContribution"("sprintPhaseId");

-- CreateIndex
CREATE UNIQUE INDEX "SprintVote_sprintPhaseId_voterId_contributionId_key" ON "SprintVote"("sprintPhaseId", "voterId", "contributionId");

-- CreateIndex
CREATE INDEX "SprintVote_sprintPhaseId_idx" ON "SprintVote"("sprintPhaseId");

-- CreateIndex
CREATE INDEX "SprintVote_voterId_idx" ON "SprintVote"("voterId");

-- CreateIndex
CREATE INDEX "SprintComment_contributionId_idx" ON "SprintComment"("contributionId");

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintPhase" ADD CONSTRAINT "SprintPhase_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintContribution" ADD CONSTRAINT "SprintContribution_sprintPhaseId_fkey" FOREIGN KEY ("sprintPhaseId") REFERENCES "SprintPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintContribution" ADD CONSTRAINT "SprintContribution_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintVote" ADD CONSTRAINT "SprintVote_sprintPhaseId_fkey" FOREIGN KEY ("sprintPhaseId") REFERENCES "SprintPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintVote" ADD CONSTRAINT "SprintVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintVote" ADD CONSTRAINT "SprintVote_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "SprintContribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintComment" ADD CONSTRAINT "SprintComment_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "SprintContribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintComment" ADD CONSTRAINT "SprintComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintComment" ADD CONSTRAINT "SprintComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SprintComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

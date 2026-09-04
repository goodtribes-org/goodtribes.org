-- CreateEnum
CREATE TYPE "PilotDecision" AS ENUM ('PENDING', 'GO', 'NO_GO');

-- CreateEnum
CREATE TYPE "NextStepDecision" AS ENUM ('UNDECIDED', 'CONTINUE', 'REPLICATE', 'CLOSE_RESPONSIBLY');

-- CreateTable
CREATE TABLE "PilotEvaluation" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "successCriteria" TEXT,
    "executionNotes" TEXT,
    "resultsSummary" TEXT,
    "decision" "PilotDecision" NOT NULL DEFAULT 'PENDING',
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PilotEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstablishmentPlan" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "scaledProcessNotes" TEXT,
    "supporterBaseNotes" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstablishmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScalingPlan" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "goals" TEXT,
    "geographies" TEXT,
    "capitalPlan" TEXT,
    "teamOrLicenseModel" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScalingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactFollowup" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "externalVerificationNotes" TEXT,
    "celebrationNotes" TEXT,
    "nextStepDecision" "NextStepDecision" NOT NULL DEFAULT 'UNDECIDED',
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImpactFollowup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PilotEvaluation_projectSlug_key" ON "PilotEvaluation"("projectSlug");

-- CreateIndex
CREATE UNIQUE INDEX "EstablishmentPlan_projectSlug_key" ON "EstablishmentPlan"("projectSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ScalingPlan_projectSlug_key" ON "ScalingPlan"("projectSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ImpactFollowup_projectSlug_key" ON "ImpactFollowup"("projectSlug");

-- AddForeignKey
ALTER TABLE "PilotEvaluation" ADD CONSTRAINT "PilotEvaluation_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilotEvaluation" ADD CONSTRAINT "PilotEvaluation_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstablishmentPlan" ADD CONSTRAINT "EstablishmentPlan_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstablishmentPlan" ADD CONSTRAINT "EstablishmentPlan_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScalingPlan" ADD CONSTRAINT "ScalingPlan_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScalingPlan" ADD CONSTRAINT "ScalingPlan_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactFollowup" ADD CONSTRAINT "ImpactFollowup_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactFollowup" ADD CONSTRAINT "ImpactFollowup_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Phase gate (decision point at the end of a phase). Additive only:
--   * a new AiInsightKind value (PHASE_GATE) -- not used within this
--     migration, so adding it inside the migration's transaction is safe
--   * a new enum and a new table for the decisions
-- No existing data is modified.

-- CreateEnum
CREATE TYPE "PhaseGateOutcome" AS ENUM ('CONTINUE', 'ADJUST', 'PIVOT', 'PAUSE');

-- AlterEnum
ALTER TYPE "AiInsightKind" ADD VALUE 'PHASE_GATE';

-- CreateTable
CREATE TABLE "PhaseGateDecision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromPhase" "ProjectPhase" NOT NULL,
    "outcome" "PhaseGateOutcome" NOT NULL,
    "note" TEXT,
    "missing" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "decidedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhaseGateDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhaseGateDecision_projectId_createdAt_idx" ON "PhaseGateDecision"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "PhaseGateDecision" ADD CONSTRAINT "PhaseGateDecision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;


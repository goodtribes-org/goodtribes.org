-- Adds PhaseTarget (per-project-phase start/target dates for the new
-- Roadmap page) and two nullable columns on Milestone (startDate,
-- completedAt). Purely additive: one new table, two new nullable columns,
-- nothing existing altered.

-- CreateTable
CREATE TABLE "PhaseTarget" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phase" "ProjectPhase" NOT NULL,
    "startDate" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhaseTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhaseTarget_projectId_phase_key" ON "PhaseTarget"("projectId", "phase");

-- CreateIndex
CREATE INDEX "PhaseTarget_projectId_idx" ON "PhaseTarget"("projectId");

-- AddForeignKey
ALTER TABLE "PhaseTarget" ADD CONSTRAINT "PhaseTarget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN "startDate" TIMESTAMP(3),
ADD COLUMN "completedAt" TIMESTAMP(3);

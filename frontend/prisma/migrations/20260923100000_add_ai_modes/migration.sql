-- AI modes on project, phase and step level (steg 1 of the AI-guided project
-- start, see src/lib/aiMode.ts). Additive only:
--   * a new AiMode enum value (ASSIST) -- not used within this migration, so
--     adding it inside the migration's transaction is safe on Postgres 12+
--   * two new nullable/defaulted Project columns (existing rows get
--     aiMode = NULL, which resolveAiMode treats as "behave exactly as before")
--   * two new override tables
-- No existing data is modified.

-- AlterEnum
ALTER TYPE "AiMode" ADD VALUE 'ASSIST';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "aiMode" "AiMode",
ADD COLUMN     "aiProjectManager" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ProjectPhaseAiSetting" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phase" "ProjectPhase" NOT NULL,
    "aiMode" "AiMode" NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectPhaseAiSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectStepAiSetting" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "aiMode" "AiMode" NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectStepAiSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPhaseAiSetting_projectId_phase_key" ON "ProjectPhaseAiSetting"("projectId", "phase");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStepAiSetting_projectId_stepKey_key" ON "ProjectStepAiSetting"("projectId", "stepKey");

-- AddForeignKey
ALTER TABLE "ProjectPhaseAiSetting" ADD CONSTRAINT "ProjectPhaseAiSetting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStepAiSetting" ADD CONSTRAINT "ProjectStepAiSetting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;


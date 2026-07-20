-- Additive step of the status -> phase migration (see PRD.md 4d).
-- Adds the new ProjectPhase lifecycle field alongside the existing status
-- column, plus the decoupled archivedAt flag and the two new tracking
-- tables. Nothing here removes or renames anything the app currently reads,
-- so this is safe to deploy ahead of the code migration.

-- CreateEnum
CREATE TYPE "ProjectPhase" AS ENUM ('IDEA', 'PROJECT', 'PILOT', 'PRODUCTION', 'ESTABLISH', 'SCALE', 'IMPACT');

-- AlterTable: additive, nullable — nothing reads these columns yet.
ALTER TABLE "Project" ADD COLUMN "phase" "ProjectPhase";
ALTER TABLE "Project" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Backfill phase from the old status column. status and phase measure
-- different axes (build stage vs. initiative maturity) so this mapping is
-- an approximation, documented here rather than hidden in application code:
--   CONCEPT    -> IDEA       (not yet built)
--   PROTOTYPE  -> PILOT      (PRD's pilot phase explicitly means "prototyp")
--   PRODUCTION -> PRODUCTION (names coincide, direct mapping)
--   DELIVERY   -> ESTABLISH  (feature-complete / actively delivering value)
--   ARCHIVED   -> ESTABLISH  (no historical phase was recorded before
--                             archiving; ESTABLISH assumes "was in stable
--                             operation" as the least-wrong default)
UPDATE "Project" SET "phase" = CASE "status"
  WHEN 'CONCEPT' THEN 'IDEA'::"ProjectPhase"
  WHEN 'PROTOTYPE' THEN 'PILOT'::"ProjectPhase"
  WHEN 'PRODUCTION' THEN 'PRODUCTION'::"ProjectPhase"
  WHEN 'DELIVERY' THEN 'ESTABLISH'::"ProjectPhase"
  WHEN 'ARCHIVED' THEN 'ESTABLISH'::"ProjectPhase"
  ELSE 'IDEA'::"ProjectPhase"
END;

-- Backfill archivedAt for legacy-archived projects. updatedAt is used as an
-- approximation of the archive timestamp since it wasn't tracked separately
-- before (archiveProject() only ever set status = 'ARCHIVED').
UPDATE "Project" SET "archivedAt" = "updatedAt" WHERE "status" = 'ARCHIVED';

-- CreateTable
CREATE TABLE "PhaseTransition" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromPhase" "ProjectPhase",
    "toPhase" "ProjectPhase" NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhaseTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiativeChecklistItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phase" "ProjectPhase" NOT NULL,
    "itemKey" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,

    CONSTRAINT "InitiativeChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhaseTransition_projectId_idx" ON "PhaseTransition"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "InitiativeChecklistItem_projectId_itemKey_key" ON "InitiativeChecklistItem"("projectId", "itemKey");

-- CreateIndex
CREATE INDEX "InitiativeChecklistItem_projectId_idx" ON "InitiativeChecklistItem"("projectId");

-- AddForeignKey
ALTER TABLE "PhaseTransition" ADD CONSTRAINT "PhaseTransition_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseTransition" ADD CONSTRAINT "PhaseTransition_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeChecklistItem" ADD CONSTRAINT "InitiativeChecklistItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeChecklistItem" ADD CONSTRAINT "InitiativeChecklistItem_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed one PhaseTransition row per existing project, representing its
-- "first registered phase" per PRD 4d's startpoint exception
-- (from_phase = NULL). changedBy is the project owner since there is no
-- real actor to attribute this historical, backfilled transition to.
INSERT INTO "PhaseTransition" ("id", "projectId", "fromPhase", "toPhase", "changedById", "changedAt")
SELECT
  'ptbackfill_' || "id",
  "id",
  NULL,
  "phase",
  "ownerId",
  "createdAt"
FROM "Project";

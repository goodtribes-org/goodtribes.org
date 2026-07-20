-- Cutover step of the status -> phase migration (see PRD.md 4d).
-- Mirrors the earlier ProjectStatus enum cutover
-- (20260714090500_cutover_project_status_enum): re-backfill any rows
-- written since the additive migration, then drop the old column/type.

-- Re-backfill any rows written since the additive migration.
UPDATE "Project" SET "phase" = CASE "status"
  WHEN 'CONCEPT' THEN 'IDEA'::"ProjectPhase"
  WHEN 'PROTOTYPE' THEN 'PILOT'::"ProjectPhase"
  WHEN 'PRODUCTION' THEN 'PRODUCTION'::"ProjectPhase"
  WHEN 'DELIVERY' THEN 'ESTABLISH'::"ProjectPhase"
  WHEN 'ARCHIVED' THEN 'ESTABLISH'::"ProjectPhase"
  ELSE 'IDEA'::"ProjectPhase"
END
WHERE "phase" IS NULL;

UPDATE "Project" SET "archivedAt" = "updatedAt"
WHERE "status" = 'ARCHIVED' AND "archivedAt" IS NULL;

-- AlterTable: cut over to the enum column.
ALTER TABLE "Project" ALTER COLUMN "phase" SET NOT NULL;
ALTER TABLE "Project" ALTER COLUMN "phase" SET DEFAULT 'IDEA';
ALTER TABLE "Project" DROP COLUMN "status";

-- DropEnum
DROP TYPE "ProjectStatus";

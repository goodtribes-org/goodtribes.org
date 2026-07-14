-- Re-backfill any rows written since the additive migration, then cut over.
UPDATE "Project" SET "statusV2" = CASE "status"
  WHEN 'concept' THEN 'CONCEPT'::"ProjectStatus"
  WHEN 'prototype' THEN 'PROTOTYPE'::"ProjectStatus"
  WHEN 'production' THEN 'PRODUCTION'::"ProjectStatus"
  WHEN 'delivery' THEN 'DELIVERY'::"ProjectStatus"
  WHEN 'archived' THEN 'ARCHIVED'::"ProjectStatus"
  ELSE 'CONCEPT'::"ProjectStatus"
END
WHERE "statusV2" IS NULL;

-- AlterTable: cut over to the enum column.
ALTER TABLE "Project" ALTER COLUMN "statusV2" SET NOT NULL;
ALTER TABLE "Project" ALTER COLUMN "statusV2" SET DEFAULT 'CONCEPT';
ALTER TABLE "Project" DROP COLUMN "status";
ALTER TABLE "Project" RENAME COLUMN "statusV2" TO "status";

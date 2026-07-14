-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('CONCEPT', 'PROTOTYPE', 'PRODUCTION', 'DELIVERY', 'ARCHIVED');

-- AlterTable: additive, nullable — nothing reads this column yet.
ALTER TABLE "Project" ADD COLUMN "statusV2" "ProjectStatus";

-- Backfill from the existing free-text status column. "archived" is a real
-- value written by the alumni archive action even though it was never part
-- of the documented concept/prototype/production/delivery vocabulary.
UPDATE "Project" SET "statusV2" = CASE "status"
  WHEN 'concept' THEN 'CONCEPT'::"ProjectStatus"
  WHEN 'prototype' THEN 'PROTOTYPE'::"ProjectStatus"
  WHEN 'production' THEN 'PRODUCTION'::"ProjectStatus"
  WHEN 'delivery' THEN 'DELIVERY'::"ProjectStatus"
  WHEN 'archived' THEN 'ARCHIVED'::"ProjectStatus"
  ELSE 'CONCEPT'::"ProjectStatus"
END;

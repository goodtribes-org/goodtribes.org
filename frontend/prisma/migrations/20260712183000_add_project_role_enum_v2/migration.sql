-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('FOUNDER', 'ADMIN', 'MEMBER', 'FOLLOWER');

-- AlterTable: additive, nullable — nothing reads this column yet.
ALTER TABLE "ProjectMember" ADD COLUMN "roleV2" "ProjectRole";
ALTER TABLE "ProjectInvite" ADD COLUMN "roleV2" "ProjectRole";

-- Backfill from the existing free-text role column.
UPDATE "ProjectMember" SET "roleV2" = CASE "role"
  WHEN 'owner' THEN 'FOUNDER'::"ProjectRole"
  WHEN 'admin' THEN 'ADMIN'::"ProjectRole"
  WHEN 'collaborator' THEN 'MEMBER'::"ProjectRole"
  WHEN 'follower' THEN 'FOLLOWER'::"ProjectRole"
  ELSE 'MEMBER'::"ProjectRole"
END;

UPDATE "ProjectInvite" SET "roleV2" = CASE "role"
  WHEN 'owner' THEN 'FOUNDER'::"ProjectRole"
  WHEN 'admin' THEN 'ADMIN'::"ProjectRole"
  WHEN 'collaborator' THEN 'MEMBER'::"ProjectRole"
  WHEN 'follower' THEN 'FOLLOWER'::"ProjectRole"
  ELSE 'MEMBER'::"ProjectRole"
END;

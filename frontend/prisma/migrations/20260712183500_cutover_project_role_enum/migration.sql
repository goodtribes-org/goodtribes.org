-- Re-backfill any rows written since the additive migration, then cut over.
UPDATE "ProjectMember" SET "roleV2" = CASE "role"
  WHEN 'owner' THEN 'FOUNDER'::"ProjectRole"
  WHEN 'admin' THEN 'ADMIN'::"ProjectRole"
  WHEN 'collaborator' THEN 'MEMBER'::"ProjectRole"
  WHEN 'follower' THEN 'FOLLOWER'::"ProjectRole"
  ELSE 'MEMBER'::"ProjectRole"
END
WHERE "roleV2" IS NULL;

UPDATE "ProjectInvite" SET "roleV2" = CASE "role"
  WHEN 'owner' THEN 'FOUNDER'::"ProjectRole"
  WHEN 'admin' THEN 'ADMIN'::"ProjectRole"
  WHEN 'collaborator' THEN 'MEMBER'::"ProjectRole"
  WHEN 'follower' THEN 'FOLLOWER'::"ProjectRole"
  ELSE 'MEMBER'::"ProjectRole"
END
WHERE "roleV2" IS NULL;

-- AlterTable: cut over to the enum column.
ALTER TABLE "ProjectMember" ALTER COLUMN "roleV2" SET NOT NULL;
ALTER TABLE "ProjectMember" ALTER COLUMN "roleV2" SET DEFAULT 'MEMBER';
ALTER TABLE "ProjectMember" DROP COLUMN "role";
ALTER TABLE "ProjectMember" RENAME COLUMN "roleV2" TO "role";

ALTER TABLE "ProjectInvite" ALTER COLUMN "roleV2" SET NOT NULL;
ALTER TABLE "ProjectInvite" ALTER COLUMN "roleV2" SET DEFAULT 'MEMBER';
ALTER TABLE "ProjectInvite" DROP COLUMN "role";
ALTER TABLE "ProjectInvite" RENAME COLUMN "roleV2" TO "role";

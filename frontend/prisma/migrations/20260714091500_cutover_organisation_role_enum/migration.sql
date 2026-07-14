-- Re-backfill any rows written since the additive migration, then cut over.
UPDATE "OrganisationMember" SET "roleV2" = CASE "role"
  WHEN 'owner' THEN 'OWNER'::"OrganisationRole"
  WHEN 'admin' THEN 'ADMIN'::"OrganisationRole"
  WHEN 'member' THEN 'MEMBER'::"OrganisationRole"
  ELSE 'MEMBER'::"OrganisationRole"
END
WHERE "roleV2" IS NULL;

UPDATE "OrgInvite" SET "roleV2" = CASE "role"
  WHEN 'owner' THEN 'OWNER'::"OrganisationRole"
  WHEN 'admin' THEN 'ADMIN'::"OrganisationRole"
  WHEN 'member' THEN 'MEMBER'::"OrganisationRole"
  ELSE 'MEMBER'::"OrganisationRole"
END
WHERE "roleV2" IS NULL;

-- AlterTable: cut over to the enum column.
ALTER TABLE "OrganisationMember" ALTER COLUMN "roleV2" SET NOT NULL;
ALTER TABLE "OrganisationMember" ALTER COLUMN "roleV2" SET DEFAULT 'MEMBER';
ALTER TABLE "OrganisationMember" DROP COLUMN "role";
ALTER TABLE "OrganisationMember" RENAME COLUMN "roleV2" TO "role";

ALTER TABLE "OrgInvite" ALTER COLUMN "roleV2" SET NOT NULL;
ALTER TABLE "OrgInvite" ALTER COLUMN "roleV2" SET DEFAULT 'MEMBER';
ALTER TABLE "OrgInvite" DROP COLUMN "role";
ALTER TABLE "OrgInvite" RENAME COLUMN "roleV2" TO "role";

-- CreateEnum
CREATE TYPE "OrganisationRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- AlterTable: additive, nullable — nothing reads these columns yet.
ALTER TABLE "OrganisationMember" ADD COLUMN "roleV2" "OrganisationRole";
ALTER TABLE "OrgInvite" ADD COLUMN "roleV2" "OrganisationRole";

-- Backfill from the existing free-text role column.
UPDATE "OrganisationMember" SET "roleV2" = CASE "role"
  WHEN 'owner' THEN 'OWNER'::"OrganisationRole"
  WHEN 'admin' THEN 'ADMIN'::"OrganisationRole"
  WHEN 'member' THEN 'MEMBER'::"OrganisationRole"
  ELSE 'MEMBER'::"OrganisationRole"
END;

UPDATE "OrgInvite" SET "roleV2" = CASE "role"
  WHEN 'owner' THEN 'OWNER'::"OrganisationRole"
  WHEN 'admin' THEN 'ADMIN'::"OrganisationRole"
  WHEN 'member' THEN 'MEMBER'::"OrganisationRole"
  ELSE 'MEMBER'::"OrganisationRole"
END;

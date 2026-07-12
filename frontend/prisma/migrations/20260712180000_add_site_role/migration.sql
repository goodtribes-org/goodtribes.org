-- CreateEnum
CREATE TYPE "SiteRole" AS ENUM ('USER', 'ADMIN', 'OWNER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "siteRole" "SiteRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN "suspendedAt" TIMESTAMP(3);

-- DataMigration: grant the GoodTribes.org founder site-wide OWNER access.
-- NOTE: verify this email against production before this migration runs there —
-- it must match the real account, not the historical ADMIN_EMAIL fallback
-- ("niklas.gunnas@goodtribes.org") found in the pre-existing ethics/academy admin checks.
UPDATE "User" SET "siteRole" = 'OWNER' WHERE "email" = 'niklas@goodtribes.org';

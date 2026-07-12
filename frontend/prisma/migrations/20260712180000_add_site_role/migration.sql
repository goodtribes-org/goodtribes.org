-- CreateEnum
CREATE TYPE "SiteRole" AS ENUM ('USER', 'ADMIN', 'OWNER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "siteRole" "SiteRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN "suspendedAt" TIMESTAMP(3);

-- DataMigration: grant the GoodTribes.org founder site-wide OWNER access.
-- Matches both known addresses for this account (confirmed by Niklas) so the
-- patch doesn't silently no-op if the wrong one is picked.
UPDATE "User" SET "siteRole" = 'OWNER'
WHERE "email" IN ('niklas.gunnas@goodtribes.org', 'niklas@goodtribes.org');

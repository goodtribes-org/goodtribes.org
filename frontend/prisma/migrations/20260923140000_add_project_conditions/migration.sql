-- Förutsättningar (weekly hours, team mode, ambition) captured by
-- Drömsamtalet. Additive only: two new enums and three nullable Project
-- columns. Existing rows get NULL; no data is modified.

-- CreateEnum
CREATE TYPE "TeamMode" AS ENUM ('SOLO', 'SMALL', 'TEAM');

-- CreateEnum
CREATE TYPE "ProjectAmbition" AS ENUM ('HOBBY', 'VENTURE');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "ambition" "ProjectAmbition",
ADD COLUMN     "teamMode" "TeamMode",
ADD COLUMN     "weeklyHours" INTEGER;


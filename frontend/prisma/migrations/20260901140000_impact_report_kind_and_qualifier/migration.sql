-- Lets an ImpactReport distinguish delivered impact from support received,
-- an exact figure from a lower bound, and a "total since inception" figure
-- from a per-period one — plus name the funder/source.
--
-- Purely additive: the two new NOT NULL columns both carry a DEFAULT, so
-- Postgres fills existing rows without a table rewrite, and the defaults
-- (DELIVERED / EXACT) preserve exactly what every existing row already meant.
-- Generated with a schema-to-schema `prisma migrate diff` and reviewed by
-- hand per CLAUDE.md's migration-safety workflow.

-- CreateEnum
CREATE TYPE "ImpactReportKind" AS ENUM ('DELIVERED', 'SUPPORT_RECEIVED');

-- CreateEnum
CREATE TYPE "ImpactValueQualifier" AS ENUM ('EXACT', 'AT_LEAST', 'APPROXIMATE');

-- AlterTable
ALTER TABLE "ImpactReport" ADD COLUMN     "isCumulative" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "ImpactReportKind" NOT NULL DEFAULT 'DELIVERED',
ADD COLUMN     "sourceName" TEXT,
ADD COLUMN     "valueQualifier" "ImpactValueQualifier" NOT NULL DEFAULT 'EXACT';

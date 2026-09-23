-- Platform feature flags (see prisma/schema/feature-flags.prisma and
-- src/lib/featureFlags.ts). Additive only: a new enum and a new table, no
-- existing data touched. A missing row means the flag is OFF, so no seed
-- rows are needed.

-- CreateEnum
CREATE TYPE "FeatureFlagState" AS ENUM ('OFF', 'ADMINS_ONLY', 'ON');

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "key" TEXT NOT NULL,
    "state" "FeatureFlagState" NOT NULL DEFAULT 'OFF',
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("key")
);

-- Skala (#331): how the project grows, and the core that must stay the same
-- everywhere vs what may be adapted locally. Additive only.
CREATE TYPE "ScalingPath" AS ENUM ('SELF', 'OTHERS', 'HANDOVER', 'OPEN');

ALTER TABLE "ScalingPlan" ADD COLUMN "growthPath" "ScalingPath",
ADD COLUMN "coreFixed" TEXT,
ADD COLUMN "coreAdaptable" TEXT;

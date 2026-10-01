-- "♥ Tacka" on the start page creates a Kudos tied to the feed item it thanks for.
-- Additive only: two nullable columns + indexes. Existing (written) kudos keep NULL
-- targets, which never collide in the unique index (NULLs are distinct).
-- Generated with prisma migrate diff (main's schema -> this one) and reviewed by hand.

-- AlterTable
ALTER TABLE "Kudos" ADD COLUMN     "targetId" TEXT,
ADD COLUMN     "targetType" TEXT;

-- CreateIndex
CREATE INDEX "Kudos_targetType_targetId_idx" ON "Kudos"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Kudos_fromUserId_targetType_targetId_key" ON "Kudos"("fromUserId", "targetType", "targetId");


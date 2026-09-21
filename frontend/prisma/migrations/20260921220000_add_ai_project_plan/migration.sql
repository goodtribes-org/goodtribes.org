-- CreateEnum
CREATE TYPE "AiProjectPlanStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterEnum
ALTER TYPE "RoomType" ADD VALUE 'AI_INTAKE';

-- CreateTable
CREATE TABLE "AiProjectPlan" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "AiProjectPlanStatus" NOT NULL DEFAULT 'pending',
    "planJson" JSONB NOT NULL,
    "revisionCount" INTEGER NOT NULL DEFAULT 0,
    "createdProjectSlug" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProjectPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiProjectPlan_roomId_key" ON "AiProjectPlan"("roomId");

-- AddForeignKey
ALTER TABLE "AiProjectPlan" ADD CONSTRAINT "AiProjectPlan_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiProjectPlan" ADD CONSTRAINT "AiProjectPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiProjectPlan" ADD CONSTRAINT "AiProjectPlan_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


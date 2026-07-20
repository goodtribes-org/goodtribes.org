-- Idéverkstaden (PRD 5.10-5.12): adds a new Room type for collaborative
-- idea threads, an isAi flag on Message so AI-authored replies can be
-- styled/identified, and nullable back-references recording which Idea/
-- Project (if any) a thread was promoted to. Purely additive — no backfill
-- needed, nothing existing is renamed or dropped.

-- AlterEnum
ALTER TYPE "RoomType" ADD VALUE 'IDEA_THREAD';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "isAi" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN "convertedToIdeaId" TEXT,
ADD COLUMN     "convertedToProjectId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Room_convertedToIdeaId_key" ON "Room"("convertedToIdeaId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_convertedToProjectId_key" ON "Room"("convertedToProjectId");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_convertedToIdeaId_fkey" FOREIGN KEY ("convertedToIdeaId") REFERENCES "Idea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_convertedToProjectId_fkey" FOREIGN KEY ("convertedToProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drömsamtalet (steg 1 of the AI-guided project start, see
-- prisma/schema/ai.prisma's DreamConversation). Additive only: one new enum
-- and one new table. No existing data is modified.

-- CreateEnum
CREATE TYPE "DreamConversationStatus" AS ENUM ('in_progress', 'summary_pending', 'confirmed', 'abandoned');

-- CreateTable
CREATE TABLE "DreamConversation" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aiMode" "AiMode" NOT NULL,
    "state" JSONB NOT NULL DEFAULT '{}',
    "openQuestions" JSONB NOT NULL DEFAULT '[]',
    "summary" JSONB,
    "status" "DreamConversationStatus" NOT NULL DEFAULT 'in_progress',
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DreamConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DreamConversation_roomId_key" ON "DreamConversation"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "DreamConversation_projectId_key" ON "DreamConversation"("projectId");

-- CreateIndex
CREATE INDEX "DreamConversation_userId_status_idx" ON "DreamConversation"("userId", "status");

-- AddForeignKey
ALTER TABLE "DreamConversation" ADD CONSTRAINT "DreamConversation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DreamConversation" ADD CONSTRAINT "DreamConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DreamConversation" ADD CONSTRAINT "DreamConversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;


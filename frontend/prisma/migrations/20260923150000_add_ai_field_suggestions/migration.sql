-- AI suggestions shown next to project fields (ASSIST mode, or when a field
-- already has human content). Additive only: one new enum and one new
-- table. No existing data is modified.

-- CreateEnum
CREATE TYPE "AiFieldSuggestionStatus" AS ENUM ('pending', 'used', 'ignored');

-- CreateTable
CREATE TABLE "AiFieldSuggestion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "AiFieldSuggestionStatus" NOT NULL DEFAULT 'pending',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiFieldSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiFieldSuggestion_projectId_entity_status_idx" ON "AiFieldSuggestion"("projectId", "entity", "status");

-- AddForeignKey
ALTER TABLE "AiFieldSuggestion" ADD CONSTRAINT "AiFieldSuggestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;


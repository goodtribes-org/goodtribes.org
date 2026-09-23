-- AI insights about a project (Kritikern's objections, the interview
-- synthesis). Additive only: one new enum and one new table.

-- CreateEnum
CREATE TYPE "AiInsightKind" AS ENUM ('CRITIQUE', 'INTERVIEW_SYNTHESIS');

-- CreateTable
CREATE TABLE "AiInsight" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "AiInsightKind" NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiInsight_projectId_kind_createdAt_idx" ON "AiInsight"("projectId", "kind", "createdAt");

-- AddForeignKey
ALTER TABLE "AiInsight" ADD CONSTRAINT "AiInsight_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;


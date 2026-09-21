-- CreateEnum
CREATE TYPE "AiMode" AS ENUM ('MANUAL', 'AGENT');

-- CreateEnum
CREATE TYPE "AiAgentScope" AS ENUM ('TASK', 'PHASE', 'ALL');

-- AlterTable
ALTER TABLE "KanbanCard" ADD COLUMN     "createdByAi" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ToolAiPreference" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "toolKey" TEXT NOT NULL,
    "aiMode" "AiMode" NOT NULL DEFAULT 'MANUAL',
    "agentScope" "AiAgentScope" NOT NULL DEFAULT 'TASK',
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolAiPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ToolAiPreference_projectId_toolKey_key" ON "ToolAiPreference"("projectId", "toolKey");

-- AddForeignKey
ALTER TABLE "ToolAiPreference" ADD CONSTRAINT "ToolAiPreference_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolAiPreference" ADD CONSTRAINT "ToolAiPreference_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


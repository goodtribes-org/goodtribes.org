-- CreateTable
CREATE TABLE "AiTaskRun" (
    "id" TEXT NOT NULL,
    "kanbanCardId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "outputMarkdown" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AiTaskRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTaskReview" (
    "id" TEXT NOT NULL,
    "aiTaskRunId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "feedback" TEXT,
    "tokensAwarded" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiTaskReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiTaskRun_kanbanCardId_idx" ON "AiTaskRun"("kanbanCardId");

-- AddForeignKey
ALTER TABLE "AiTaskRun" ADD CONSTRAINT "AiTaskRun_kanbanCardId_fkey" FOREIGN KEY ("kanbanCardId") REFERENCES "KanbanCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTaskReview" ADD CONSTRAINT "AiTaskReview_aiTaskRunId_fkey" FOREIGN KEY ("aiTaskRunId") REFERENCES "AiTaskRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTaskReview" ADD CONSTRAINT "AiTaskReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

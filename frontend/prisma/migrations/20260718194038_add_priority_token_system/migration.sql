-- AlterTable
ALTER TABLE "KanbanCard" ADD COLUMN     "lockedTokenValue" DOUBLE PRECISION,
ADD COLUMN     "priorityLockedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "KanbanCardPriorityChange" (
    "id" TEXT NOT NULL,
    "kanbanCardId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "fromPriority" TEXT NOT NULL,
    "toPriority" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanbanCardPriorityChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GtLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokens" DOUBLE PRECISION NOT NULL,
    "sourceTokenLedgerId" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GtLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KanbanCardPriorityChange_kanbanCardId_idx" ON "KanbanCardPriorityChange"("kanbanCardId");

-- CreateIndex
CREATE INDEX "GtLedger_userId_idx" ON "GtLedger"("userId");

-- AddForeignKey
ALTER TABLE "KanbanCardPriorityChange" ADD CONSTRAINT "KanbanCardPriorityChange_kanbanCardId_fkey" FOREIGN KEY ("kanbanCardId") REFERENCES "KanbanCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanCardPriorityChange" ADD CONSTRAINT "KanbanCardPriorityChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtLedger" ADD CONSTRAINT "GtLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtLedger" ADD CONSTRAINT "GtLedger_sourceTokenLedgerId_fkey" FOREIGN KEY ("sourceTokenLedgerId") REFERENCES "TokenLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

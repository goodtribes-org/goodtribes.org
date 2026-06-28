-- CreateTable
CREATE TABLE "KanbanCardSubtask" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanbanCardSubtask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KanbanCardSubtask_cardId_idx" ON "KanbanCardSubtask"("cardId");

-- AddForeignKey
ALTER TABLE "KanbanCardSubtask" ADD CONSTRAINT "KanbanCardSubtask_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "KanbanCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

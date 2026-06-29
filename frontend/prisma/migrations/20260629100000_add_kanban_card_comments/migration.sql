CREATE TABLE "KanbanCardComment" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KanbanCardComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "KanbanCardComment_cardId_idx" ON "KanbanCardComment"("cardId");
ALTER TABLE "KanbanCardComment" ADD CONSTRAINT "KanbanCardComment_cardId_fkey"
  FOREIGN KEY ("cardId") REFERENCES "KanbanCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KanbanCardComment" ADD CONSTRAINT "KanbanCardComment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

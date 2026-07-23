-- Gantt "koppla arbetsuppgifter till varandra": task dependencies between
-- KanbanCards. Visual/manual only, no automatic date cascading.
CREATE TABLE "KanbanCardDependency" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "dependsOnId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanbanCardDependency_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KanbanCardDependency_cardId_idx" ON "KanbanCardDependency"("cardId");

CREATE INDEX "KanbanCardDependency_dependsOnId_idx" ON "KanbanCardDependency"("dependsOnId");

CREATE UNIQUE INDEX "KanbanCardDependency_cardId_dependsOnId_key" ON "KanbanCardDependency"("cardId", "dependsOnId");

ALTER TABLE "KanbanCardDependency" ADD CONSTRAINT "KanbanCardDependency_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "KanbanCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KanbanCardDependency" ADD CONSTRAINT "KanbanCardDependency_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "KanbanCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

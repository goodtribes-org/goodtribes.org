-- AlterTable
-- Lets a project lead mark an individual Kanban card as claimable by a
-- non-member (Catchafire-style micro-task). openToPublic gates the public
-- claim flow in kanban actions.ts; claimedAt distinguishes a self-claim from
-- an ordinary lead-made assignment on the same assigneeId column.
ALTER TABLE "KanbanCard" ADD COLUMN     "openToPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "claimedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "KanbanCard_openToPublic_assigneeId_idx" ON "KanbanCard"("openToPublic", "assigneeId");

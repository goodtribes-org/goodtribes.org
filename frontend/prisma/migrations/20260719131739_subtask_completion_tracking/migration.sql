-- AlterTable
ALTER TABLE "KanbanCardSubtask" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedById" TEXT;

-- AddForeignKey
ALTER TABLE "KanbanCardSubtask" ADD CONSTRAINT "KanbanCardSubtask_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Note: the "TimeLog" table is intentionally left in place (with its existing
-- foreign keys) even though the Prisma model has been removed — it still
-- holds historical logged-hours data. It is simply no longer managed by
-- Prisma/the app; nothing in this migration touches it.

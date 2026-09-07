-- Adds startDate/dueDate to InitiativeChecklistItem so the Roadmap page's
-- Gantt chart can schedule individual checklist steps, independent of their
-- completedAt/completedById completion fields. Purely additive: two new
-- nullable columns, nothing existing altered.

-- AlterTable
ALTER TABLE "InitiativeChecklistItem" ADD COLUMN "startDate" TIMESTAMP(3),
ADD COLUMN "dueDate" TIMESTAMP(3);

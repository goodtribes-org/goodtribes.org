-- Kanban cards know which phase and step of the journey they are work for,
-- and a gate decision records how many of the phase's cards were still open.
-- Additive only: three nullable columns + one index. Existing cards keep NULL
-- (not tied to a phase) until someone picks one in the card editor.

-- AlterTable
ALTER TABLE "KanbanCard" ADD COLUMN     "phase" "ProjectPhase",
ADD COLUMN     "stepKey" TEXT;

-- AlterTable
ALTER TABLE "PhaseGateDecision" ADD COLUMN     "openTaskCount" INTEGER;

-- CreateIndex
CREATE INDEX "KanbanCard_projectSlug_phase_idx" ON "KanbanCard"("projectSlug", "phase");

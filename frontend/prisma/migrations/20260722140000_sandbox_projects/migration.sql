-- Sandbox rebuild: sandbox content is now a real Project (flagged), not a
-- Room/IDEA_THREAD. The Room-based sandbox model (isSandbox/origin, and the
-- fork lineage pointing at a Room) is removed outright, not just unused —
-- see docs/PRD.md and this migration's accompanying app-code changes.

-- AlterTable
ALTER TABLE "Project" DROP CONSTRAINT "Project_forkedFromSandboxThreadId_fkey";
ALTER TABLE "Project" DROP COLUMN "forkedFromSandboxThreadId",
ADD COLUMN     "isSandbox" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "isSandbox",
DROP COLUMN "origin";

-- DropEnum
DROP TYPE "RoomOrigin";

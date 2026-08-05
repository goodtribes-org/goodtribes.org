-- Replace the repo-issue mirror with a GitHub Projects V2 board mirror.
--
-- Mirrored cards are dropped rather than migrated: their identity key changes
-- from (projectSlug, githubNumber) to (projectSlug, githubItemId), and a repo
-- mapping carries no information about which board an item sits on. The next
-- sync re-imports them. Only source='github' rows are touched — manually
-- created cards are never affected.
DELETE FROM "KanbanCard" WHERE "source" = 'github';

-- DropIndex
DROP INDEX "KanbanCard_projectSlug_githubNumber_key";

-- AlterTable
ALTER TABLE "KanbanCard" ADD COLUMN     "githubItemId" TEXT,
ADD COLUMN     "githubRepoName" TEXT,
ADD COLUMN     "githubStatus" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "KanbanCard_projectSlug_githubItemId_key" ON "KanbanCard"("projectSlug", "githubItemId");

-- DropTable
DROP TABLE "ProjectGithubRepo";

-- CreateTable
CREATE TABLE "ProjectGithubBoard" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "ownerLogin" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL DEFAULT 'organization',
    "projectNumber" INTEGER NOT NULL,
    "projectNodeId" TEXT,
    "projectTitle" TEXT,
    "projectUrl" TEXT,
    "statusOptions" JSONB NOT NULL DEFAULT '[]',
    "columnMap" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectGithubBoard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectGithubBoard_projectSlug_key" ON "ProjectGithubBoard"("projectSlug");

-- AddForeignKey
ALTER TABLE "ProjectGithubBoard" ADD CONSTRAINT "ProjectGithubBoard_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "KanbanCard" ADD COLUMN     "githubAssignees" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "githubAuthor" TEXT,
ADD COLUMN     "githubDraft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "githubLabels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "githubMerged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "githubNumber" INTEGER,
ADD COLUMN     "githubState" TEXT,
ADD COLUMN     "githubType" TEXT,
ADD COLUMN     "githubUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "githubUrl" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual';

-- CreateTable
CREATE TABLE "ProjectGithubRepo" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "lastFullSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectGithubRepo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectGithubRepo_projectSlug_key" ON "ProjectGithubRepo"("projectSlug");

-- CreateIndex
CREATE INDEX "KanbanCard_projectSlug_source_idx" ON "KanbanCard"("projectSlug", "source");

-- CreateIndex
CREATE UNIQUE INDEX "KanbanCard_projectSlug_githubNumber_key" ON "KanbanCard"("projectSlug", "githubNumber");

-- AddForeignKey
ALTER TABLE "ProjectGithubRepo" ADD CONSTRAINT "ProjectGithubRepo_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;


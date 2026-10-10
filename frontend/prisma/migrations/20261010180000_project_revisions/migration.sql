-- Föreslå en ändring (#290): a proposed new value for a project's summary,
-- description or a Social Lean Canvas field, accepted or declined by a lead.
-- Additive only: a new enum and a new table.


-- CreateEnum
CREATE TYPE "ProjectRevisionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "ProjectRevision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "baseValue" TEXT,
    "proposedValue" TEXT NOT NULL,
    "reason" TEXT,
    "status" "ProjectRevisionStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "cardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectRevision_projectId_status_idx" ON "ProjectRevision"("projectId", "status");

-- CreateIndex
CREATE INDEX "ProjectRevision_authorId_idx" ON "ProjectRevision"("authorId");

-- AddForeignKey
ALTER TABLE "ProjectRevision" ADD CONSTRAINT "ProjectRevision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRevision" ADD CONSTRAINT "ProjectRevision_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRevision" ADD CONSTRAINT "ProjectRevision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRevision" ADD CONSTRAINT "ProjectRevision_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "KanbanCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;


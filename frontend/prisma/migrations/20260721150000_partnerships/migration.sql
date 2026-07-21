-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN     "country" TEXT;

-- CreateTable
CREATE TABLE "Partnership" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'partner',
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "proposedBy" TEXT NOT NULL,
    "initiatedById" TEXT NOT NULL,
    "respondedById" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partnership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Partnership_organisationId_idx" ON "Partnership"("organisationId");

-- CreateIndex
CREATE INDEX "Partnership_projectId_idx" ON "Partnership"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Partnership_projectId_organisationId_key" ON "Partnership"("projectId", "organisationId");

-- AddForeignKey
ALTER TABLE "Partnership" ADD CONSTRAINT "Partnership_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partnership" ADD CONSTRAINT "Partnership_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partnership" ADD CONSTRAINT "Partnership_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partnership" ADD CONSTRAINT "Partnership_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

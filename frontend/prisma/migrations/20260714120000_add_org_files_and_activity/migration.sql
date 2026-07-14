-- AlterTable: File — additive, nullable FKs. Existing rows (avatar/cover
-- uploads) keep both columns null, correctly unattached.
ALTER TABLE "File" ADD COLUMN "projectId" TEXT;
ALTER TABLE "File" ADD COLUMN "organisationId" TEXT;

-- CreateIndex
CREATE INDEX "File_projectId_idx" ON "File"("projectId");
CREATE INDEX "File_organisationId_idx" ON "File"("organisationId");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "File" ADD CONSTRAINT "File_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: ActivityEvent — projectId becomes optional, organisationId added.
-- Existing rows keep their projectId, so this backfills no data.
ALTER TABLE "ActivityEvent" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "ActivityEvent" ADD COLUMN "organisationId" TEXT;

-- CreateIndex
CREATE INDEX "ActivityEvent_organisationId_idx" ON "ActivityEvent"("organisationId");

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

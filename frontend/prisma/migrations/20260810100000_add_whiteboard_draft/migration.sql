-- CreateTable
CREATE TABLE "WhiteboardDraft" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "documentState" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "promotedToProjectSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhiteboardDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhiteboardDraft_promotedToProjectSlug_key" ON "WhiteboardDraft"("promotedToProjectSlug");

-- CreateIndex
CREATE INDEX "WhiteboardDraft_ownerId_idx" ON "WhiteboardDraft"("ownerId");

-- AddForeignKey
ALTER TABLE "WhiteboardDraft" ADD CONSTRAINT "WhiteboardDraft_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhiteboardDraft" ADD CONSTRAINT "WhiteboardDraft_promotedToProjectSlug_fkey" FOREIGN KEY ("promotedToProjectSlug") REFERENCES "Project"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

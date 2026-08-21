-- Value Proposition Canvas as its own standalone tool (mirrors the
-- LeanCanvas / LeanCanvasVersion / LeanCanvasDraft table shape).

-- CreateTable
CREATE TABLE "ValueProposition" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "vpJobs" TEXT,
    "vpPains" TEXT,
    "vpGains" TEXT,
    "vpProducts" TEXT,
    "vpRelievers" TEXT,
    "vpCreators" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValueProposition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ValueProposition_projectSlug_key" ON "ValueProposition"("projectSlug");

-- AddForeignKey
ALTER TABLE "ValueProposition" ADD CONSTRAINT "ValueProposition_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValueProposition" ADD CONSTRAINT "ValueProposition_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ValuePropositionVersion" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "vpJobs" TEXT,
    "vpPains" TEXT,
    "vpGains" TEXT,
    "vpProducts" TEXT,
    "vpRelievers" TEXT,
    "vpCreators" TEXT,
    "savedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValuePropositionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ValuePropositionVersion_projectSlug_createdAt_idx" ON "ValuePropositionVersion"("projectSlug", "createdAt");

-- AddForeignKey
ALTER TABLE "ValuePropositionVersion" ADD CONSTRAINT "ValuePropositionVersion_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValuePropositionVersion" ADD CONSTRAINT "ValuePropositionVersion_savedById_fkey" FOREIGN KEY ("savedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ValuePropositionDraft" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT,
    "vpJobs" TEXT,
    "vpPains" TEXT,
    "vpGains" TEXT,
    "vpProducts" TEXT,
    "vpRelievers" TEXT,
    "vpCreators" TEXT,
    "promotedToProjectSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValuePropositionDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ValuePropositionDraft_promotedToProjectSlug_key" ON "ValuePropositionDraft"("promotedToProjectSlug");

-- CreateIndex
CREATE INDEX "ValuePropositionDraft_ownerId_idx" ON "ValuePropositionDraft"("ownerId");

-- AddForeignKey
ALTER TABLE "ValuePropositionDraft" ADD CONSTRAINT "ValuePropositionDraft_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValuePropositionDraft" ADD CONSTRAINT "ValuePropositionDraft_promotedToProjectSlug_fkey" FOREIGN KEY ("promotedToProjectSlug") REFERENCES "Project"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "LeanCanvasDraft" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "problem" TEXT,
    "alternatives" TEXT,
    "customerSegments" TEXT,
    "earlyAdopters" TEXT,
    "uniqueValueProposition" TEXT,
    "concept" TEXT,
    "solution" TEXT,
    "channels" TEXT,
    "revenueStreams" TEXT,
    "costStructure" TEXT,
    "impact" TEXT,
    "keyMetrics" TEXT,
    "unfairAdvantage" TEXT,
    "promotedToProjectSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeanCanvasDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeanCanvasDraft_promotedToProjectSlug_key" ON "LeanCanvasDraft"("promotedToProjectSlug");

-- CreateIndex
CREATE INDEX "LeanCanvasDraft_ownerId_idx" ON "LeanCanvasDraft"("ownerId");

-- AddForeignKey
ALTER TABLE "LeanCanvasDraft" ADD CONSTRAINT "LeanCanvasDraft_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeanCanvasDraft" ADD CONSTRAINT "LeanCanvasDraft_promotedToProjectSlug_fkey" FOREIGN KEY ("promotedToProjectSlug") REFERENCES "Project"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

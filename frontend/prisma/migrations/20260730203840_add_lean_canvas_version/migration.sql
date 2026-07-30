-- CreateTable
CREATE TABLE "LeanCanvasVersion" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
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
    "savedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeanCanvasVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeanCanvasVersion_projectSlug_createdAt_idx" ON "LeanCanvasVersion"("projectSlug", "createdAt");

-- AddForeignKey
ALTER TABLE "LeanCanvasVersion" ADD CONSTRAINT "LeanCanvasVersion_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeanCanvasVersion" ADD CONSTRAINT "LeanCanvasVersion_savedById_fkey" FOREIGN KEY ("savedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "LeanCanvas" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "problem" TEXT,
    "customerSegments" TEXT,
    "uniqueValueProposition" TEXT,
    "solution" TEXT,
    "channels" TEXT,
    "revenueStreams" TEXT,
    "costStructure" TEXT,
    "keyMetrics" TEXT,
    "unfairAdvantage" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeanCanvas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeanCanvas_projectSlug_key" ON "LeanCanvas"("projectSlug");

-- AddForeignKey
ALTER TABLE "LeanCanvas" ADD CONSTRAINT "LeanCanvas_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeanCanvas" ADD CONSTRAINT "LeanCanvas_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

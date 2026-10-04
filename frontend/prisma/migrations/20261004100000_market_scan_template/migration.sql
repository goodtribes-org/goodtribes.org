-- #207: the market scan template — which canvas field an entry speaks to,
-- a member's "Stämmer", and the scan's conclusion. Additive only.
-- AlterTable
ALTER TABLE "MarketScanEntry" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "linkedField" TEXT;

-- CreateTable
CREATE TABLE "MarketScanConclusion" (
    "projectSlug" TEXT NOT NULL,
    "strengths" TEXT,
    "gap" TEXT,
    "firstContacts" TEXT,
    "createdByAi" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketScanConclusion_pkey" PRIMARY KEY ("projectSlug")
);

-- AddForeignKey
ALTER TABLE "MarketScanConclusion" ADD CONSTRAINT "MarketScanConclusion_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;


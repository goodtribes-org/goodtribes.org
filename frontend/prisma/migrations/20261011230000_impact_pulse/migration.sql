-- Impactpuls (#335): additive only, one new table.
-- CreateTable
CREATE TABLE "ImpactPulse" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT,
    "imageUrl" TEXT,
    "impactUpdateId" TEXT,
    "snoozedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImpactPulse_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "ImpactPulse_impactUpdateId_key" ON "ImpactPulse"("impactUpdateId");
-- CreateIndex
CREATE INDEX "ImpactPulse_projectId_createdAt_idx" ON "ImpactPulse"("projectId", "createdAt");
-- AddForeignKey
ALTER TABLE "ImpactPulse" ADD CONSTRAINT "ImpactPulse_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ImpactPulse" ADD CONSTRAINT "ImpactPulse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ImpactPulse" ADD CONSTRAINT "ImpactPulse_impactUpdateId_fkey" FOREIGN KEY ("impactUpdateId") REFERENCES "ImpactUpdate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

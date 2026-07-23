-- PRD 4d: verified SDG outcome reports required to unlock the
-- `scale` -> `impact` phase transition.
CREATE TABLE "ImpactReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sdgGoals" INTEGER[],
    "metricDescription" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpactReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImpactReport_projectId_idx" ON "ImpactReport"("projectId");

ALTER TABLE "ImpactReport" ADD CONSTRAINT "ImpactReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImpactReport" ADD CONSTRAINT "ImpactReport_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

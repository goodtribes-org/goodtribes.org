-- Social Lean Canvas impact model. New table only.
CREATE TABLE "ImpactModel" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "issue" TEXT,
    "participants" TEXT,
    "activities" TEXT,
    "shortTermOutcomes" TEXT,
    "mediumTermOutcomes" TEXT,
    "longTermOutcomes" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImpactModel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImpactModel_projectSlug_key" ON "ImpactModel"("projectSlug");

ALTER TABLE "ImpactModel" ADD CONSTRAINT "ImpactModel_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImpactModel" ADD CONSTRAINT "ImpactModel_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Version history for the impact model. New table only.
CREATE TABLE "ImpactModelVersion" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "issue" TEXT,
    "participants" TEXT,
    "activities" TEXT,
    "shortTermOutcomes" TEXT,
    "mediumTermOutcomes" TEXT,
    "longTermOutcomes" TEXT,
    "savedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpactModelVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImpactModelVersion_projectSlug_createdAt_idx" ON "ImpactModelVersion"("projectSlug", "createdAt");

ALTER TABLE "ImpactModelVersion" ADD CONSTRAINT "ImpactModelVersion_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImpactModelVersion" ADD CONSTRAINT "ImpactModelVersion_savedById_fkey" FOREIGN KEY ("savedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

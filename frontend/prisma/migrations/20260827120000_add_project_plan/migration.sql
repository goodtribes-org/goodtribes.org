-- CreateTable
-- Simpler alternative to LeanCanvas: one goal/milestones/resources/risks
-- form, no version history or comments. Additive-only, low-risk (same shape
-- as 20260826210000_add_site_copy) — no shadow-database diff needed.
CREATE TABLE "ProjectPlan" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "goal" TEXT,
    "milestones" TEXT,
    "resources" TEXT,
    "risks" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPlan_projectSlug_key" ON "ProjectPlan"("projectSlug");

-- AddForeignKey
ALTER TABLE "ProjectPlan" ADD CONSTRAINT "ProjectPlan_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPlan" ADD CONSTRAINT "ProjectPlan_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

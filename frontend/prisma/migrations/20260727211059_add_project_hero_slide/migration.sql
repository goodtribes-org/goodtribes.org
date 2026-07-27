-- CreateTable
CREATE TABLE "ProjectHeroSlide" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "body2" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectHeroSlide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectHeroSlide_projectId_idx" ON "ProjectHeroSlide"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectHeroSlide" ADD CONSTRAINT "ProjectHeroSlide_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

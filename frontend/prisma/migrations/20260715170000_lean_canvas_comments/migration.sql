-- CreateTable
CREATE TABLE "LeanCanvasComment" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeanCanvasComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeanCanvasComment_projectSlug_idx" ON "LeanCanvasComment"("projectSlug");

-- AddForeignKey
ALTER TABLE "LeanCanvasComment" ADD CONSTRAINT "LeanCanvasComment_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeanCanvasComment" ADD CONSTRAINT "LeanCanvasComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

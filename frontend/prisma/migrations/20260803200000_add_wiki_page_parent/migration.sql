-- AlterTable
ALTER TABLE "WikiPage" ADD COLUMN "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WikiPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropIndex
DROP INDEX "SitePage_slug_key";

-- AlterTable
ALTER TABLE "SitePage" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'sv';

-- CreateIndex
CREATE UNIQUE INDEX "SitePage_slug_locale_key" ON "SitePage"("slug", "locale");

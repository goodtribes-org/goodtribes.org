-- AlterTable
ALTER TABLE "HomeHeroSettings" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'sv';

-- AlterTable
ALTER TABLE "HomeHeroSlide" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'sv';

-- AlterTable
ALTER TABLE "OnboardingStep" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'sv';

-- CreateIndex
CREATE UNIQUE INDEX "HomeHeroSettings_locale_key" ON "HomeHeroSettings"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingStep_order_locale_key" ON "OnboardingStep"("order", "locale");

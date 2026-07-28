-- CreateTable
CREATE TABLE "HomeHeroSettings" (
    "id" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeHeroSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingStep" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingStep_pkey" PRIMARY KEY ("id")
);

-- Seed today's hardcoded copy (frontend/src/components/HeroPhotoStack.tsx's
-- "Välkommen till GoodTribes" heading and OnboardingStepsBar.tsx's
-- ONBOARDING_STEPS array) so production content doesn't change until an
-- admin edits it.
INSERT INTO "HomeHeroSettings" ("id", "heading", "updatedAt")
VALUES ('homeherosettings_singleton', 'Välkommen till GoodTribes', CURRENT_TIMESTAMP);

INSERT INTO "OnboardingStep" ("id", "order", "label", "href", "createdAt", "updatedAt")
VALUES
  ('onboardingstep_seed_1', 0, 'Skapa ett konto', '/login', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('onboardingstep_seed_2', 1, 'Hitta projekt som är rätt för dig', '/projects', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('onboardingstep_seed_3', 2, '"Joina" din Tribe som brinner för samma saker som du', '/projects/new', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('onboardingstep_seed_4', 3, 'Vidareutveckla eller lägg upp en egen idé/projekt', '/ideas/new', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('onboardingstep_seed_5', 4, 'Förändra världen genom små och stora insatser', '/hall-of-impact', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('onboardingstep_seed_6', 5, 'Lev gott, Må gott, Gör gott och förverkliga idéer och drömmar', '/about', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

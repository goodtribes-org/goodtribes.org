-- CreateTable
CREATE TABLE "SandboxHeroSettings" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'sv',
    "heroKicker" TEXT NOT NULL,
    "heroDescription" TEXT NOT NULL,
    "levaGottHeading" TEXT NOT NULL,
    "levaGottBody" TEXT NOT NULL,
    "maGottHeading" TEXT NOT NULL,
    "maGottBody" TEXT NOT NULL,
    "goraGottHeading" TEXT NOT NULL,
    "goraGottBody" TEXT NOT NULL,
    "dreamGoodHeading" TEXT NOT NULL,
    "dreamGoodBody" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SandboxHeroSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SandboxHeroSettings_locale_key" ON "SandboxHeroSettings"("locale");

-- Seed today's hardcoded copy (frontend/src/app/[locale]/sandbox/page.tsx's
-- SandboxPage.heroKicker/heroDescription and Pillars.tsx's SandboxPillars
-- translations) for both shipped locales, so production content doesn't
-- change until a site admin edits it via /site-admin/sandbox-hero.
INSERT INTO "SandboxHeroSettings"
  ("id", "locale", "heroKicker", "heroDescription", "levaGottHeading", "levaGottBody", "maGottHeading", "maGottBody", "goraGottHeading", "goraGottBody", "dreamGoodHeading", "dreamGoodBody", "updatedAt")
VALUES
  (
    'sandboxherosettings_sv',
    'sv',
    '🧪 Sandbox — experimentell zon',
    'Riktiga projekt, men märkta som experimentella — testa en idé fritt innan du (eller någon annan) gör den till ett vanligt projekt. Allt här kan vara AI-genererat, halvfärdigt eller under test — vem som helst kan gaffla ett projekt utan tillstånd.',
    'Leva Gott',
    'Leva Gott: Vi människor har samma grundläggande fysiska behov av ren luft, rent vatten, mat, kläder, bostad, trygghet, välmående osv. GoodTribes vill ge alla människor möjligheten att möta dessa behov genom att kunna försörja sig på sitt engagemang för en långsiktigt hållbar miljö- och samhällsutveckling.',
    'Må Gott',
    'Må Gott: Vi människor har samma grundläggande psykologiska behov av gemenskap, uppskattning, kärlek, självbestämmande, frihet, rättvisa, utveckling och engagemang. GoodTribes vill ge alla människor friheten och möjligheten att förverkliga sina drömmar och sin fulla potential.',
    'Göra Gott',
    'Göra Gott: Vi människor har samma övergripande önskan om lycka, mening och att vara en del av ett större sammanhang. GoodTribes utgår från forskningen som visar att människor upplever störst och mest långvarig lycka, tillfredsställelse och mening när vi tillsammans med andra gör världen bättre.',
    'Dröm stort',
    'Dröm stort: Vi människor delar samma drömmar om ett bättre liv.',
    CURRENT_TIMESTAMP
  ),
  (
    'sandboxherosettings_en',
    'en',
    '🧪 Sandbox — experimental zone',
    'Real projects, but marked as experimental — try an idea freely before you (or someone else) turn it into a regular project. Anything here can be AI-generated, half-finished, or a work in progress — anyone can fork a project without permission.',
    'Living Well',
    'Living Well: We humans share the same basic physical needs — clean air, clean water, food, clothing, housing, security, wellbeing, and more. GoodTribes wants to give everyone the opportunity to meet these needs by being able to make a living through their commitment to long-term sustainable environmental and social development.',
    'Feeling Good',
    'Feeling Good: We humans share the same basic psychological needs — belonging, appreciation, love, self-determination, freedom, fairness, growth, and engagement. GoodTribes wants to give everyone the freedom and opportunity to realize their dreams and their full potential.',
    'Doing Good',
    'Doing Good: We humans share the same underlying desire for happiness, meaning, and being part of something bigger than ourselves. GoodTribes is grounded in research showing that people experience their greatest and most lasting happiness, satisfaction, and meaning when we make the world better together with others.',
    'Dream Big',
    'Dream Big: We humans share the same dreams about a better life.',
    CURRENT_TIMESTAMP
  );

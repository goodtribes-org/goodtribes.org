-- CreateEnum
CREATE TYPE "HeroTintColor" AS ENUM ('CORAL', 'SEAGRASS', 'MUTED_TEAL', 'DRY_SAGE', 'WATERMELON');

-- CreateTable
CREATE TABLE "HomeHeroSlide" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "bodyLine2" TEXT,
    "body2" TEXT,
    "obstacles" JSONB,
    "outro" TEXT,
    "points" JSONB,
    "menuLabel" TEXT NOT NULL,
    "tintColor" "HeroTintColor" NOT NULL,
    "tintOpacity" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeHeroSlide_pkey" PRIMARY KEY ("id")
);

-- Seed the 6 slides that were previously hardcoded in
-- frontend/src/components/HeroPhotoStack.tsx's PHOTOS array, so production
-- keeps today's exact homepage content the moment this migration runs.
INSERT INTO "HomeHeroSlide"
  ("id", "order", "imageUrl", "alt", "heading", "body", "bodyLine2", "body2", "obstacles", "outro", "points", "menuLabel", "tintColor", "tintOpacity", "createdAt", "updatedAt")
VALUES
(
  'homehero_seed_1', 0, '/img/Slide1.jpg', 'GoodTribes — Crowdsourcing for Good',
  'Här blir dina drömmar till verklighet – för en bättre värld',
  'Har du en idé som kan förändra samhället eller rädda miljön? Hos GoodTribes.org stannar det inte vid en dröm. Vi är en ideell stiftelse och en levande drömfabrik där människor och organisationer möts för att göra skillnad på riktigt.',
  NULL,
  'Vår vision är enkel men kraftfull: en hållbar värld där varje människa har kraften att nå sin fulla potential. Tillsammans skapar vi en rörelse och värld där vi kan Leva Gott, Må Gott och Göra Gott – både för oss själva och för varandra. Gå med i GoodTribes och förverkliga din idé idag!',
  NULL, NULL, NULL,
  'Kom igång', 'CORAL', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'homehero_seed_2', 1, '/img/Slide2.png', 'Har du en dröm? — en man kedjad till sitt skrivbord drömmer om att förverkliga sin idé',
  'Följ din dröm...',
  'Alla har idéer och drömmar som kan göra världen bättre – men forskning visar att över 92 % aldrig uppnår sina mål.',
  'Tre hinder stoppar oss:',
  NULL,
  '[{"lead":"Rädsla för misslyckande","text":"– rädslan att förlora väger tyngre än viljan att vinna, så vi väljer trygghet framför förändring."},{"lead":"Mentala blockeringar","text":"– vi intalar oss att vi saknar rätt talang, vilket hindrar första steget."},{"lead":"Vaga målsättningar","text":"– utan konkreta, mätbara delmål blir drömmar bara abstrakta fantasier."}]'::jsonb,
  'GoodTribes är utformad för att hjälpa dig förbi alla hinder…',
  NULL,
  'Våga', 'SEAGRASS', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'homehero_seed_3', 2, '/img/do-you-have-a-dream.png', 'En person lyfts av en ballong format som en glödlampa — en idé som lyfter',
  'Släpp inte taget...',
  'En bättre värld kräver mer än goda avsikter – drömmar måste bli konkreta, mätbara mål och delmål som involverar andra. Vetenskapen visar att sannolikheten att du faktiskt förverkligar din livsdröm ökar för varje steg du tar:',
  NULL, NULL, NULL, NULL,
  '[{"pct":"10 %","text":"Du har bara en idé eller dröm i huvudet."},{"pct":"25 %","text":"Du bestämmer dig medvetet för att göra det."},{"pct":"50 %","text":"Du planerar hur du ska göra det."},{"pct":"65 %","text":"Du berättar för någon annan att du ska göra det."},{"pct":"95 %","text":"Om du samverkar med andra med liknande mål."}]'::jsonb,
  'Dröm', 'MUTED_TEAL', 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'homehero_seed_4', 3, '/img/want-a-change.png', 'Vill du förändra?',
  'Testa din dröm...',
  'Forskning inom socialt entreprenörskap och effektiv altruism visar att en vetenskaplig, småskalig ansats är avgörande för att lyckas göra världen bättre. Att börja med mikroprojekt i samverkan med andra skyddar mot altruistisk utbrändhet, eftersom gapet mellan insats och globalt problem annars blir för stort – småskalig testning säkrar din och andras långsiktiga framgång.',
  NULL,
  'Pilottester mäter projektets faktiska genomslagskraft innan stora resurser satsas, och tvingar fram direkt kontakt med användarna så att lösningen bygger på verkliga behov snarare än antaganden. De mest framgångsrika initiativen använder just denna datadrivna, flexibla metodik som ständigt anpassas efter resultat.',
  NULL, NULL, NULL,
  'Testa', 'DRY_SAGE', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'homehero_seed_5', 4, '/img/what-is-goodtribes.png', 'Vad är GoodTribes?',
  'Hitta din tribe...',
  'Att förverkliga idéer och livsdrömmar tillsammans med andra ger stora fördelar enligt forskning inom socialpsykologi och organisationsteori:',
  NULL, NULL,
  '[{"lead":"Ökar handlingskraften","text":"– samverkan höjer effektiviteten, motivationen och modet."},{"lead":"Breddar kompetensen","text":"– olika perspektiv behövs för att lösa komplexa problem."},{"lead":"Skapar sund press","text":"– vilket ger bättre resultat."},{"lead":"Ger direkt feedback","text":"– ger dig möjlighet att utvecklas och snabbare nå dina mål."},{"lead":"Motverkar utbrändhet","text":"– samverkan och delat ansvar minskar tyngden att bära"}]'::jsonb,
  NULL, NULL,
  'Utveckla', 'WATERMELON', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'homehero_seed_6', 5, '/img/want-to-be-a-winner.png', 'Vill du bidra?',
  'Alla vinner...',
  'Forskningen visar att människan mår som bäst när hedonistisk lycka (att leva gott och må gott) balanseras med eudaimonisk lycka (att göra gott och följa sina drömmar). Enbart materiell njutning ger kortvarig lycka medan enbart uppoffringar utan återhämtning leder till utbrändhet – det är i symbiosen som långsiktigt välbefinnande skapas.',
  NULL,
  'Enligt självbestämmandeteorin drivs vi av autonomi, kompetens och samhörighet. Att följa sina livsdrömmar ger mening och skyddar mot psykisk ohälsa, medan att göra gott för andra utlöser ett "helper''s high" (oxytocin och dopamin) som sänker stress och förlänger livet. Att väva samman personlig livskvalitet med att göra skillnad är därför receptet för ett hållbart, meningsfullt liv.',
  NULL, NULL, NULL,
  'Alla vinner', 'CORAL', 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

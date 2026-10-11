-- Impact (#334): the project's story, a participant's voice (with consent)
-- and when the story was shared with everyone who contributed. Additive only.
ALTER TABLE "ImpactFollowup" ADD COLUMN "story" TEXT,
ADD COLUMN "voiceQuote" TEXT,
ADD COLUMN "voiceWho" TEXT,
ADD COLUMN "voiceConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "storySharedAt" TIMESTAMP(3);

-- Lansering (#327): when the pilot started and how each success criterion
-- went, and two fields for "Plan framåt". Additive only.
ALTER TABLE "PilotEvaluation" ADD COLUMN "startedAt" TIMESTAMP(3),
ADD COLUMN "criteriaResults" JSONB;

ALTER TABLE "LaunchPlan" ADD COLUMN "howToReach" TEXT,
ADD COLUMN "whoPays" TEXT;

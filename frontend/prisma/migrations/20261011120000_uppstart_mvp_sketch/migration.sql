-- Uppstart (#323): a sketch of the smallest version — a whiteboard scene
-- and/or a photo of a paper sketch. Additive only.
ALTER TABLE "ProjectPlan" ADD COLUMN "mvpSketch" JSONB,
ADD COLUMN "mvpSketchVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "mvpSketchImageKey" TEXT;

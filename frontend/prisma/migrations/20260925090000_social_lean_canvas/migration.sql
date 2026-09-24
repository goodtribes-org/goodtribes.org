-- Social Lean Canvas: two new blocks. Additive only — the old Lean Canvas
-- columns (problem, alternatives, earlyAdopters, concept) keep their data.
ALTER TABLE "LeanCanvas" ADD COLUMN "purpose" TEXT, ADD COLUMN "jobsToBeDone" TEXT;
ALTER TABLE "LeanCanvasVersion" ADD COLUMN "purpose" TEXT, ADD COLUMN "jobsToBeDone" TEXT;
ALTER TABLE "LeanCanvasDraft" ADD COLUMN "purpose" TEXT, ADD COLUMN "jobsToBeDone" TEXT;

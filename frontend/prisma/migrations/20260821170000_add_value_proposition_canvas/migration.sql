-- Value Proposition Canvas (Osterwalder): 6 new nullable text columns per
-- Lean Canvas row, on all three models that mirror the same field set.
-- Purely additive — existing uniqueValueProposition data is untouched and
-- kept as a read-only fallback.

ALTER TABLE "LeanCanvas"
  ADD COLUMN "vpJobs" TEXT,
  ADD COLUMN "vpPains" TEXT,
  ADD COLUMN "vpGains" TEXT,
  ADD COLUMN "vpProducts" TEXT,
  ADD COLUMN "vpRelievers" TEXT,
  ADD COLUMN "vpCreators" TEXT;

ALTER TABLE "LeanCanvasVersion"
  ADD COLUMN "vpJobs" TEXT,
  ADD COLUMN "vpPains" TEXT,
  ADD COLUMN "vpGains" TEXT,
  ADD COLUMN "vpProducts" TEXT,
  ADD COLUMN "vpRelievers" TEXT,
  ADD COLUMN "vpCreators" TEXT;

ALTER TABLE "LeanCanvasDraft"
  ADD COLUMN "vpJobs" TEXT,
  ADD COLUMN "vpPains" TEXT,
  ADD COLUMN "vpGains" TEXT,
  ADD COLUMN "vpProducts" TEXT,
  ADD COLUMN "vpRelievers" TEXT,
  ADD COLUMN "vpCreators" TEXT;

-- Undoes the previous migration (20260821170000_add_value_proposition_canvas).
-- The Value Proposition Canvas is becoming its own standalone tool (own
-- tables, own routes) instead of 6 extra fields bolted onto Lean Canvas —
-- these columns were added the same day and never held real user data.

ALTER TABLE "LeanCanvas"
  DROP COLUMN "vpJobs",
  DROP COLUMN "vpPains",
  DROP COLUMN "vpGains",
  DROP COLUMN "vpProducts",
  DROP COLUMN "vpRelievers",
  DROP COLUMN "vpCreators";

ALTER TABLE "LeanCanvasVersion"
  DROP COLUMN "vpJobs",
  DROP COLUMN "vpPains",
  DROP COLUMN "vpGains",
  DROP COLUMN "vpProducts",
  DROP COLUMN "vpRelievers",
  DROP COLUMN "vpCreators";

ALTER TABLE "LeanCanvasDraft"
  DROP COLUMN "vpJobs",
  DROP COLUMN "vpPains",
  DROP COLUMN "vpGains",
  DROP COLUMN "vpProducts",
  DROP COLUMN "vpRelievers",
  DROP COLUMN "vpCreators";

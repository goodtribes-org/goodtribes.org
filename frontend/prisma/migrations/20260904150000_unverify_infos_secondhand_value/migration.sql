-- DATA migration (no schema changes). Scoped to a fixed id, so a no-op in
-- any environment without this exact seeded row, and idempotent.
--
-- Per explicit direction, drops 'infos-equipment-value' (the "50+ miljoner"
-- second-hand-value circle) from the homepage's delivered-impact list, same
-- mechanism as 20260904130000_verify_infos_co2_total's removal of the
-- 16 100 figure: un-verify rather than delete, so the row and its history
-- stay intact for the project's own /impact page.
UPDATE "ImpactReport"
SET "verifiedAt" = NULL
WHERE id = 'infos-equipment-value';

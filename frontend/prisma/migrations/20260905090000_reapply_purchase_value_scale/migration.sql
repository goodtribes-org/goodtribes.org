-- DATA migration (no schema changes). Fixes a real deployment bug, not a
-- new decision — see this migration's git history for the full story.
--
-- 20260901180000_infos_equipment_value_bases (which INSERTs the
-- 'infos-equipment-purchase-value' row) sat uncommitted on disk this whole
-- time and was only just committed alongside this migration. Meanwhile
-- 20260904140000_scale_infos_purchase_value_to_25000_units — which UPDATEs
-- that same row to the 25 000-unit-scaled estimate — WAS already committed
-- and deployed, and `prisma migrate deploy` marks it applied regardless of
-- whether its WHERE clause actually matched anything. In production the row
-- didn't exist yet when that UPDATE ran, so it silently affected zero rows:
-- the "Inköpsvärde" circle never appeared on the live site even though it
-- rendered correctly in every local/dev environment where the row already
-- existed from direct SQL application. `migrate deploy` will apply this
-- migrations folder's 20260901180000 (now committed) on the next deploy,
-- creating the row — but won't re-run 20260904140000 a second time to scale
-- it, since it's already recorded as applied. This migration re-does that
-- exact same UPDATE under a new name so it actually executes this time.
UPDATE "ImpactReport"
SET "metricValue" = 147515528,
    "valueQualifier" = 'APPROXIMATE'::"ImpactValueQualifier",
    "isCumulative" = true,
    "periodEnd" = NULL,
    "metricDescription" = 'Ursprungligt inköpspris för all förmedlad utrustning, uppskattat utifrån samma styckpris (~5 900 kr) som Stockholms stads rapport anger för 2005–2008-perioden'
WHERE id = 'infos-equipment-purchase-value';

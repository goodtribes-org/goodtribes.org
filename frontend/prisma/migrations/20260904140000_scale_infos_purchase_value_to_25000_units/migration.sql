-- DATA migration (no schema changes). Scoped to a fixed id, so a no-op in
-- any environment without this exact seeded row (including a fresh
-- database), and idempotent (re-running lands on the same values).
--
-- 'infos-equipment-purchase-value' (introduced in
-- 20260901180000_infos_equipment_value_bases) stated the original purchase
-- price for only the 16 100 units donated 2005-2008, per Stockholms stads
-- report on that specific grant period: 95 000 000 kr, ~5 900.62 kr/unit.
--
-- Per explicit direction, the homepage circle for this figure should track
-- the same 25 000-unit "since inception" scope as the other two headline
-- circles (donated units, second-hand value), not just the 2005-2008
-- subset. Stockholms stad's report doesn't cover donations outside that
-- period, so there is no sourced purchase-price total for all 25 000 units
-- — this applies the *same* per-unit rate the report does give us
-- (95 000 000 / 16 100 ≈ 5 900.62 kr) across the full 25 000, which is
-- necessarily an estimate, not a re-statement of the report's own number.
-- That's why this also flips the qualifier to APPROXIMATE and rewrites the
-- description to say so explicitly, rather than quietly presenting a bigger
-- number under the original "per Stockholms stads report" framing.
UPDATE "ImpactReport"
SET "metricValue" = 147515528,
    "valueQualifier" = 'APPROXIMATE'::"ImpactValueQualifier",
    "isCumulative" = true,
    "periodEnd" = NULL,
    "metricDescription" = 'Ursprungligt inköpspris för all förmedlad utrustning, uppskattat utifrån samma styckpris (~5 900 kr) som Stockholms stads rapport anger för 2005–2008-perioden'
WHERE id = 'infos-equipment-purchase-value';

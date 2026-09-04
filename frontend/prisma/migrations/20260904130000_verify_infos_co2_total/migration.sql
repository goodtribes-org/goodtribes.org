-- DATA migration (no schema changes). Two editorial decisions for the
-- homepage "Så långt kan en idé nå" widget's stat circles, both scoped to
-- fixed ids so this is a no-op in any environment without these exact
-- seeded rows (including a fresh database), and idempotent either way.
--
-- 1. Verifies 'infos-co2-total' (the CO2e-avoided figure introduced in
--    20260901160000_seed_infos_impact_reports as PENDING, since it's
--    modelled from unit counts via IVL's published emission factors rather
--    than directly counted — see that migration's own comment). This is a
--    deliberate exception to the normal site-admin review flow described in
--    CLAUDE.md: ordinarily a human reads the method and clicks verify at
--    /site-admin/impact-reports, but that review happened out-of-band here
--    and this migration just records the outcome, same as how the original
--    seed migration itself recorded the foundation's own historical figures
--    directly rather than re-entering them through the UI.
-- 2. Un-verifies 'infos-units-2005-2008' (the 16 100-unit, 2005-2008 figure)
--    back to pending, at the same request, so it drops out of the
--    publicly-shown delivered list without deleting the underlying row —
--    reversible, and the history stays intact for the project's own
--    /impact page and any future review.

UPDATE "ImpactReport"
SET "verifiedAt" = '2026-09-04'::timestamp
WHERE id = 'infos-co2-total' AND "verifiedAt" IS NULL;

UPDATE "ImpactReport"
SET "verifiedAt" = NULL
WHERE id = 'infos-units-2005-2008';

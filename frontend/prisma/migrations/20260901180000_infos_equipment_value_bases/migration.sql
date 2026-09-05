-- DATA migration. Makes the two equipment-value figures for
-- Infos: Datordonation state which valuation basis they use, and adds the
-- second one.
--
-- The figures are not alternatives to each other and neither supersedes the
-- other:
--   * 50 MSEK is the SECOND-HAND value of everything forwarded since the
--     operation started (~2 000 kr across 25 000 units).
--   * 95 MSEK is the ORIGINAL PURCHASE PRICE of the equipment forwarded
--     during 2005-2008 alone (~5 900 kr across 16 100 units), per Stockholms
--     stads report on the grant period.
-- A ~34% second-hand-to-new ratio for three-to-four-year-old business
-- hardware is what you would expect, so the two are consistent.
--
-- Stating the basis is the whole point of this migration. Without it a reader
-- sees "50 MSEK total" next to "95 MSEK for a four-year sub-period" and
-- concludes the project cannot add up — which is exactly the wrong conclusion,
-- and one that would discredit every other figure on the page with it.
--
-- Both statements are guarded (on the old description, and on ON CONFLICT)
-- so this is idempotent and a no-op in any environment without the project.

UPDATE "ImpactReport"
SET "metricDescription" = 'Andrahandsvärde på förmedlad IT-utrustning'
WHERE id = 'infos-equipment-value'
  AND "metricDescription" = 'Värde på förmedlad IT-utrustning';

INSERT INTO "ImpactReport" (
  id, "projectId", "sdgGoals", "metricDescription", "metricValue", "metricUnit",
  kind, "valueQualifier", "isCumulative", "sourceName",
  "periodStart", "periodEnd", "evidenceUrl",
  "createdById", "verifiedAt", "createdAt"
)
SELECT 'infos-equipment-purchase-value', p.id, ARRAY[4,10,12],
       'Ursprungligt inköpspris för utrustningen, enligt Stockholms stads rapport',
       95000000::double precision, 'kr',
       'DELIVERED'::"ImpactReportKind", 'EXACT'::"ImpactValueQualifier", false,
       'Företag och myndigheter',
       '2005-01-01'::timestamp, '2008-12-31'::timestamp, NULL,
       p."ownerId", '2026-09-01'::timestamp, '2005-01-04'::timestamp
FROM "Project" p
WHERE p.slug = 'infos-datordonation'
ON CONFLICT (id) DO NOTHING;

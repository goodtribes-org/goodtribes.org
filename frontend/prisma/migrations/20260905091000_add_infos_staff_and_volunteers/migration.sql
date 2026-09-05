-- DATA migration (no schema changes). Adds two new verified impact reports
-- for Infos: Datordonation, per explicit direction — the people behind the
-- redistribution work, not just the equipment: at least 10 full-time staff
-- and at least 150 volunteers ("eldsjälar") over the project's history.
-- Scoped by slug (no-op without this project) and ON CONFLICT (id) DO
-- NOTHING (idempotent), same pattern as every other seed/data migration for
-- this project.
INSERT INTO "ImpactReport" (
  id, "projectId", "sdgGoals", "metricDescription", "metricValue", "metricUnit",
  kind, "valueQualifier", "isCumulative", "sourceName",
  "periodStart", "periodEnd", "evidenceUrl",
  "createdById", "verifiedAt", "createdAt"
)
SELECT v.id, p.id, ARRAY[8],
       v.descr, v.val, NULL,
       'DELIVERED'::"ImpactReportKind", 'AT_LEAST'::"ImpactValueQualifier", true,
       NULL,
       '2005-01-01'::timestamp, NULL, NULL,
       p."ownerId", '2026-09-05'::timestamp, v.created::timestamp
FROM "Project" p
CROSS JOIN (VALUES
  ('infos-fulltime-staff', 'Heltidsanställda som arbetar med verksamheten', 10::double precision, '2026-09-05 09:11:00'),
  ('infos-volunteers', 'Frivilliga eldsjälar som engagerat sig i verksamheten', 150::double precision, '2026-09-05 09:11:01')
) AS v(id, descr, val, created)
WHERE p.slug = 'infos-datordonation'
ON CONFLICT (id) DO NOTHING;

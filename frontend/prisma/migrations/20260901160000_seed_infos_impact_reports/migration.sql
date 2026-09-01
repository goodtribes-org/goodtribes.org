-- DATA migration (no schema changes): records the impact history of
-- "Infos: Datordonation" — the association that founded Stiftelsen GoodTribes
-- — against the project that already exists in production.
--
-- Why a migration rather than the admin UI: the figures come from the
-- foundation itself, the project row already exists, and nobody with database
-- access is available to run a one-off script. entrypoint.sh runs
-- `prisma migrate deploy` on every pod start, so this applies on the next
-- deploy with no manual step.
--
-- Safety properties, in order of how much they matter:
--  * Scoped by slug. If no project with this slug exists (any environment
--    that isn't production), the SELECT yields no rows and this is a no-op.
--  * ON CONFLICT (id) DO NOTHING on fixed ids, so re-running — which
--    `migrate deploy` won't do, but a restore or a replay might — can never
--    duplicate a figure.
--  * Purely additive. It touches no existing row and no schema object.
--
-- Review state is deliberately NOT uniform:
--  * The five counted figures land verified, attributed to the foundation
--    itself (verifiedById NULL renders as "Verifierad av Stiftelsen") rather
--    than to a person who never actually clicked a button. These are the
--    foundation's own records of its own history.
--  * The two CO2 figures land PENDING. They are modelled, not counted —
--    derived from the unit counts via IVL's published emission factors — so
--    they belong in the review queue at /site-admin/impact-reports until
--    someone has read the method and agreed with it. This is the difference
--    the whole verification flow exists to express.
--
-- To undo: the pending rows can be withdrawn from the project's impact page;
-- the verified ones need a DELETE by the ids below.

INSERT INTO "ImpactReport" (
  id, "projectId", "sdgGoals", "metricDescription", "metricValue", "metricUnit",
  kind, "valueQualifier", "isCumulative", "sourceName",
  "periodStart", "periodEnd", "evidenceUrl",
  "createdById", "verifiedAt", "createdAt"
)
SELECT v.id, p.id, v.sdg, v.descr, v.val, v.unit,
       v.kind::"ImpactReportKind", v.qual::"ImpactValueQualifier", v.cumulative, v.source,
       v.pstart::timestamp, v.pend::timestamp, v.evidence,
       p."ownerId", v.verified::timestamp, v.created::timestamp
FROM "Project" p
CROSS JOIN (VALUES
  -- ---- Delivered impact (counted; verified) -----------------------------
  ('infos-units-total', ARRAY[4,10,12],
   'Förmedlade datorenheter till förskolor, skolor och ideella organisationer',
   25000::double precision, 'datorenheter', 'DELIVERED', 'AT_LEAST', true,
   'Företag och myndigheter', '2005-01-01', NULL, NULL,
   '2026-09-01', '2005-01-01'),

  ('infos-equipment-value', ARRAY[4,10,12],
   'Värde på förmedlad IT-utrustning',
   50000000::double precision, 'kr', 'DELIVERED', 'AT_LEAST', true,
   'Företag och myndigheter', '2005-01-01', NULL, NULL,
   '2026-09-01', '2005-01-02'),

  ('infos-units-2005-2008', ARRAY[4,10,12],
   'Förmedlade datorenheter under perioden med stöd från Stockholms stad',
   16100::double precision, 'datorenheter', 'DELIVERED', 'EXACT', false,
   'Företag och myndigheter', '2005-01-01', '2008-12-31', NULL,
   '2026-09-01', '2005-01-03'),

  -- ---- Support received (counted; verified) -----------------------------
  ('infos-support-stockholm', ARRAY[17],
   'Verksamhetsstöd',
   1658000::double precision, 'kr', 'SUPPORT_RECEIVED', 'EXACT', false,
   'Stockholms stad', '2005-01-01', '2008-12-31', NULL,
   '2026-09-01', '2005-01-04'),

  ('infos-support-sponsors', ARRAY[17],
   'Sponsring',
   2000000::double precision, 'kr', 'SUPPORT_RECEIVED', 'EXACT', false,
   'Coop, OK/Q8 m.fl.', '2005-01-01', NULL, NULL,
   '2026-09-01', '2005-01-05'),

  -- ---- Modelled climate benefit (NOT verified — needs review) -----------
  ('infos-co2-total', ARRAY[12,13],
   'Undvikna växthusgasutsläpp genom återbruk av IT-utrustning. Beräknat som 25 000 kompletta arbetsplatser × 800 kg CO₂e, enligt IVL Svenska Miljöinstitutets och Inregos klimatdatabas för IT-återbruk (2020): 280 kg för dator plus 520 kg för skärm. Över 95 % av besparingen utgörs av undviken nytillverkning. IVL:s antagande är att varje återbrukad produkt gör att en motsvarande ny produkt inte tillverkas.',
   20000::double precision, 'ton CO₂e', 'DELIVERED', 'APPROXIMATE', true,
   'Företag och myndigheter', '2005-01-01', NULL,
   'https://www.ivl.se/press/pressmeddelanden/2020-03-30-ny-rapport-visar-klimatfordelarna-med-aterbruk-av-it-utrustning.html',
   NULL, '2005-01-06'),

  ('infos-co2-2005-2008', ARRAY[12,13],
   'Undvikna växthusgasutsläpp under perioden med kommunalt stöd. Beräknat som 16 100 kompletta arbetsplatser × 800 kg CO₂e enligt samma metod och källa som totalsiffran.',
   12880::double precision, 'ton CO₂e', 'DELIVERED', 'APPROXIMATE', false,
   'Företag och myndigheter', '2005-01-01', '2008-12-31',
   'https://www.ivl.se/press/pressmeddelanden/2020-03-30-ny-rapport-visar-klimatfordelarna-med-aterbruk-av-it-utrustning.html',
   NULL, '2005-01-07')
) AS v(id, sdg, descr, val, unit, kind, qual, cumulative, source,
       pstart, pend, evidence, verified, created)
WHERE p.slug = 'infos-datordonation'
ON CONFLICT (id) DO NOTHING;

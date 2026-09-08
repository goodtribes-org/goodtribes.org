# Drop orphaned Strapi tables

**Who can run this:** whoever has `kubectl`/production Postgres access (Mattias). Cannot be done from a sandboxed session — needs a real connection to production.

## Background

Strapi was removed from this repo on 2026-08-03 (see `CLAUDE.md`'s "Known issues" section). Its Postgres tables were never dropped from production — nothing reads or writes them anymore, but they still physically exist in the `public` schema alongside Prisma's own tables.

**Before running any DROP statement**, confirm whether production's old Strapi content (About/Privacy/Terms) had any real edited copy beyond what's hardcoded in `frontend/src/lib/defaultSitePages.ts`. If so, re-enter it via the site-admin pencil UI (`SitePage` model) *first* — once these tables are dropped, that content is gone for good.

## Step 1 — Discover what's actually there (read-only, safe to run any time)

Don't assume the table list below is complete or still accurate — confirm against the real database first:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE 'up\_%' ESCAPE '\'
    OR table_name LIKE 'strapi\_%' ESCAPE '\'
    OR table_name LIKE 'admin\_%' ESCAPE '\'
    OR table_name IN (
      'files', 'upload_folders', 'i18n_locale',
      'abouts', 'privacy_policies', 'terms_of_services'
    )
    OR table_name LIKE '%\_components' ESCAPE '\'
    OR table_name LIKE '%\_lnk' ESCAPE '\'
  )
ORDER BY table_name;
```

Also sanity-check none of these are actually referenced anywhere before proceeding:

```bash
# From frontend/, should return nothing (already confirmed empty as of 2026-08-03 removal, but re-check)
grep -rniE "up_users|strapi_|admin_permissions|upload_folders|i18n_locale" src/ prisma/
```

## Step 2 — Confirm no foreign keys point *into* these tables from tables you still use

```sql
SELECT
  tc.table_name AS referencing_table,
  kcu.column_name,
  ccu.table_name AS referenced_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name IN (/* paste the list from Step 1 here */);
```

If this returns rows where `referencing_table` is a real Prisma-managed table (not another Strapi table), stop and investigate — that would mean something still depends on this data.

## Step 3 — Take a fresh backup first

Don't rely solely on the nightly cron for this — take an explicit one immediately before dropping anything:

```bash
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h goodtribes-postgres -U goodtribes -d goodtribes \
  --format=custom --file "/tmp/pre-strapi-drop-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

## Step 4 — Drop the tables

Only after Steps 1–3 confirm it's safe. Use the **exact table list from Step 1's query output**, not a guessed list:

```sql
BEGIN;

-- Paste the confirmed table list from Step 1 here, e.g.:
-- DROP TABLE IF EXISTS up_users, up_permissions, up_roles, strapi_administrator,
--   admin_permissions, admin_roles, admin_users, files, upload_folders,
--   i18n_locale, abouts, privacy_policies, terms_of_services
--   /* ...plus every _lnk / _components join table Step 1 found... */
--   CASCADE;

-- Sanity check: should return 0 rows
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'strapi\_%' ESCAPE '\';

COMMIT; -- only if the sanity check above looks right, otherwise ROLLBACK;
```

`CASCADE` is only needed if Step 2 found join tables with FKs pointing at these — drop join/link tables first without `CASCADE` if you'd rather not rely on it.

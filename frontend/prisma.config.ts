// Prisma 7 config for the CLI (generate/migrate/studio). Replaces the
// `datasource.url` that used to live directly in prisma/schema.prisma — see
// the CLAUDE.md migration-safety workflow for how schema changes are applied
// (never `prisma migrate dev` against the real DB).
//
// Deliberately does NOT import "dotenv/config": every command in this repo's
// docs/CLAUDE.md/skills already passes DATABASE_URL explicitly on the command
// line (e.g. `DATABASE_URL="postgresql://..." npx prisma migrate deploy`),
// and in Kubernetes/Docker Compose the var is injected directly into the
// process environment. Adding a dotenv dependency here would only matter if
// this project actually relied on Node loading a local .env file for CLI
// invocations, which it doesn't — and it would need to ship inside the
// production runner image (see Dockerfile) purely for the `prisma migrate
// deploy` step, which isn't otherwise needed.
//
// Uses plain `process.env.DATABASE_URL` rather than the `env()` helper:
// `env()` resolves eagerly at config-load time and throws if the var is
// unset, but `prisma generate` doesn't need a live DATABASE_URL at all (it
// only reads the schema) and Docker's builder stage runs it with no DB
// available (see Dockerfile — DATABASE_URL is only ever real at container
// startup, for `prisma migrate deploy` in entrypoint.sh). An unresolved
// `env()` call broke `docker compose build frontend` outright, which is
// exactly the failure this migration needs to not reproduce.
import { defineConfig } from "prisma/config"

// `schema` points at a directory, not a single file: Prisma 7's multi-file
// schema support (stable, no preview flag needed) merges every *.prisma file
// in prisma/schema/ order-independently for validation/generate/migrate.
// Introduced to split the single ~2800-line schema.prisma into per-domain
// files (see that directory) — purely organizational, no schema/DB change.
export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
    // Prisma 7's CLI dropped the `migrate diff --shadow-database-url` flag —
    // it now reads this field instead (see CLAUDE.md's migration-safety
    // workflow). Left undefined by default so it's a no-op for `generate`/
    // `migrate deploy`; export SHADOW_DATABASE_URL pointed at a throwaway
    // container only when running `migrate diff` against the migrations
    // directory, same discipline as DATABASE_URL above — never the real DB.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
})

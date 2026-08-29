# Integration tests

Files matching `*.integration.test.ts` run against a real Postgres with all
migrations applied — unlike the rest of `src/__tests__`, which mock Prisma or
test pure functions with no database at all.

## Running locally

```bash
docker run -d --name goodtribes-integration-pg \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=goodtribes_test \
  -p 15435:5432 postgres:16-alpine

# from frontend/
DATABASE_URL="postgresql://postgres:postgres@localhost:15435/goodtribes_test" npx prisma migrate deploy
DATABASE_URL="postgresql://postgres:postgres@localhost:15435/goodtribes_test" npm run test:integration
```

Use a throwaway container, never a real dev/prod database — these tests
create and delete real rows (rolled back per-test, see `testDb.ts`, but still
real writes against whatever `DATABASE_URL` points at).

## How isolation works

Each test wraps its body in `withRollback` (`testDb.ts`), which runs it inside
a single `prisma.$transaction` and always rolls back at the end. Real
Postgres constraints (foreign keys, unique indexes, cascades) apply during
the test, but nothing persists afterward — so tests never need manual
cleanup and can't interfere with each other's rows. `seedUserAndProject`/
`seedUser` suffix every unique column with `pid-counter` so parallel test
*files* (each gets `maxWorkers: 1` serialized cases within a file, but
separate files can still run concurrently — see jest.integration.config.js)
never collide even without the rollback.

## CI dependency: blocked on PR #61

`prisma migrate deploy` against a genuinely fresh database currently fails —
`frontend/prisma/migrations/20260728120000_add_home_hero_slide` sorts
alphabetically after `20260728093000_merge_home_hero_body2_into_body`, which
depends on it (see CLAUDE.md's "Known issues" — this is the still-open PR #61
fix, deliberately unmerged pending Mattias confirming a `migrate resolve`
against production). GitHub Actions' Postgres service container starts empty
on every run, so it hits this exact bug. **This CI integration-test step
cannot go green until #61 merges.** Do not work around this by renaming the
migration folder as part of this change — that rename is PR #61's own fix and
must land through that PR, not be duplicated here.

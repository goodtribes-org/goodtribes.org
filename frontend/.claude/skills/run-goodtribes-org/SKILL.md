---
name: run-goodtribes-org
description: Build, run, start, and screenshot GoodTribes.org frontend. Use when asked to start the app, take a screenshot, test a UI change, run the dev server, or drive the running app.
---

GoodTribes.org is a Swedish Next.js 16 App Router frontend. Drive it by starting the dev server then running `smoke.mjs` (a Playwright script) against it. No `chromium-cli` on this host — use the script.

All paths are relative to `frontend/`.

## Prerequisites

Install the driver's dependencies and the Chromium headless shell:

```bash
cd frontend/.claude/skills/run-goodtribes-org
npm install
npx playwright install chromium
```

The Chromium download (~113 MB) lands in `~/.cache/ms-playwright/` and is reused on subsequent runs.

## Setup

Postgres must be running. Docker Compose brings it up:

```bash
# from repo root
docker compose up -d postgres
# wait until healthy
timeout 30 bash -c 'until docker exec goodtribesorg-postgres-1 pg_isready -U goodtribes; do sleep 1; done'
```

Postgres container IP for connecting from host (if `localhost` gives ECONNREFUSED):

```bash
docker inspect goodtribesorg-postgres-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
# → e.g. 172.18.0.2
```

The migration is already applied. If you add schema changes, run:

```bash
DATABASE_URL="postgresql://goodtribes:changeme@172.18.0.2:5432/goodtribes" \
  npx --workspace=frontend prisma migrate dev
```

## Run (agent path)

Start the dev server in the background, wait for it to be ready, then run the smoke driver:

```bash
# Start dev server (use an unused port — 3000 may be taken by Docker)
DATABASE_URL="postgresql://goodtribes:changeme@172.18.0.2:5432/goodtribes" \
AUTH_SECRET="dev-local" \
NEXTAUTH_URL="http://localhost:3010" \
PORT=3010 \
npm run dev > /tmp/goodtribes-dev.log 2>&1 &
echo $! > /tmp/goodtribes-dev.pid

# Poll until ready (takes ~1 s)
timeout 40 bash -c 'until curl -sf http://localhost:3010 >/dev/null; do sleep 1; done' && echo "ready"

# Run smoke driver (from the skill directory)
cd frontend/.claude/skills/run-goodtribes-org
node smoke.mjs --base http://localhost:3010 --shots /tmp/shots
```

Stop with:

```bash
kill $(cat /tmp/goodtribes-dev.pid)
```

Screenshots land in `/tmp/shots/`:

| file | page |
|---|---|
| `home.png` | `/` hero |
| `members.png` | `/members` — opted-in member cards |
| `skills.png` | `/skill` — skill directory |
| `orgs.png` | `/org` — org directory |
| `login.png` | `/login` — magic-link form |
| `login-filled.png` | login form with email typed |

## Run (human path)

```bash
# from repo root — starts all services including postgres
docker compose up --build
# Frontend → http://localhost:3000
```

Or just the frontend against running services:

```bash
DATABASE_URL="postgresql://goodtribes:changeme@172.18.0.2:5432/goodtribes" \
AUTH_SECRET="dev-local" \
npm run dev:frontend
# → http://localhost:3000
```

## Test

No test suite is defined yet (`npm test` exits without running anything).

TypeScript check:

```bash
npx tsc --noEmit    # run from frontend/
```

---

## Gotchas

- **`/login` redirects to `/`** when `AUTH_SECRET` is blank (the Docker Compose image was built without it). Always set `AUTH_SECRET` to any non-empty string when starting the dev server — `"dev-local"` works.

- **Port 3000/3001/3002 already in use** — the Docker container running from `docker compose up` holds 3000. Pick a different port (`PORT=3010`) for the dev server. Check with `ss -tlnp | grep 300`.

- **`DATABASE_URL` must use the container IP, not `localhost`** — the Postgres container is not exposed on `localhost:5432`. Get the IP with `docker inspect goodtribesorg-postgres-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'`. As of last run: `172.18.0.2`.

- **`playwright` not on global path** — always run `node smoke.mjs` from the skill directory (`frontend/.claude/skills/run-goodtribes-org/`) after `npm install` there. Node resolves the import relative to the script's location, not cwd.

- **First page compile takes ~700 ms** — `networkidle` in the smoke script handles this; don't use `domcontentloaded`.

- **New Prisma fields need `prisma generate`** — after a schema change the Docker build re-runs `npx prisma generate`, but for the dev server you must run it manually: `npx --workspace=frontend prisma generate` from repo root.

## Troubleshooting

- **`ERR_MODULE_NOT_FOUND: Cannot find package 'playwright'`**: Run from the skill directory (`cd frontend/.claude/skills/run-goodtribes-org && npm install`) and then `node smoke.mjs` from there.
- **`EADDRINUSE: address already in use :::3010`**: Another process is on that port. Pick a different PORT value.
- **`PrismaClientInitializationError: Environment variable not found: DATABASE_URL`**: Export DATABASE_URL before starting the dev server.
- **`UntrustedHost` errors in the log**: Set `AUTH_SECRET` and `NEXTAUTH_URL` to matching values.

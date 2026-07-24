# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

GoodTribes.org — a platform connecting skilled volunteers with impact-driven organisations. This repo is the `goodtribes-org/goodtribes.org` GitHub repo (not the agent repo).

Stack: Next.js 16 (App Router) frontend + Strapi 5 backend + PostgreSQL + Meilisearch, deployed to Kubernetes via GitOps.

## Quick commands

```bash
# Docker (recommended — starts all services)
docker compose up --build
# Frontend → http://localhost:3000  Strapi admin → http://localhost:1337/admin

# npm workspaces (requires services running separately)
npm run dev:services          # postgres + meilisearch only (docker)
npm run dev:frontend          # Next.js dev server (:3000)
npm run dev:backend           # Strapi dev server (:1337)

# Build
npm run build:frontend
npm run build:backend

# Lint
npm run lint --workspace=frontend

# Prisma (run from repo root or frontend/)
npx --workspace=frontend prisma generate
npx --workspace=frontend prisma migrate deploy   # NEVER `prisma migrate dev` — see warning below
```

### ⚠️ Never run `prisma migrate dev` — it can wipe the whole database

`prisma migrate dev` diffs the *actual target database* against Prisma's migration history and will reset (drop + recreate) the schema if it sees anything it doesn't recognize as drift. On 2026-07-15 this happened for real: Strapi's tables lived in the same `public` schema as Prisma's (see the schema-separation note below — this is now fixed locally, but treat the rule as permanent), Prisma saw them as unrecognized drift, and a non-interactive run of `migrate dev` went ahead and executed `DROP SCHEMA public CASCADE` without a real confirmation — wiping every table's data. There was no backup or seed script to restore it.

To add a schema change safely, use this workflow instead of `migrate dev`:

```bash
# 1. Edit prisma/schema.prisma

# 2. Generate the SQL diff against a throwaway shadow DB (never touches the real target)
npx prisma migrate diff \
  --from-migrations ./prisma/migrations \
  --to-schema-datamodel ./prisma/schema.prisma \
  --shadow-database-url "$DATABASE_URL" \
  --script > /tmp/migration.sql

# 3. Review /tmp/migration.sql by hand — strip out anything unrelated to your change
#    (pre-existing drift can show up here too; don't apply what you didn't intend)

# 4. Hand-create prisma/migrations/<YYYYMMDDHHMMSS>_<name>/migration.sql with the reviewed SQL
#    (several migrations in this repo are already hand-crafted this way)

# 5. Apply it — history-based, no destructive drift/reset check
npx prisma migrate deploy
```

Local Postgres isn't exposed on `localhost:5432` by default — port-forward it first, e.g. a throwaway `alpine/socat` container on the `goodtribesorg_goodtribes` docker network, or run the commands from inside a container on that network.

## Environment setup

Copy `.env.example` to `.env` in the repo root. Required additions beyond the example for local dev:

```
AUTH_SECRET=<any random string>
RESEND_API_KEY=<from resend.com>
STRAPI_APP_KEYS=<comma-separated random strings, e.g. two base64 values — required for Strapi to boot at all>
STRAPI_API_TOKEN=<generate in Strapi admin after first run>
NEXT_PUBLIC_MEILI_SEARCH_KEY=<public search key from Meilisearch>
```

## Architecture

### Frontend (`frontend/`)

Next.js 16 App Router SPA. Internationalized via `next-intl` — all page routes live under `src/app/[locale]/` (`sv` default, `en` also supported); `src/app/api/**`, `manifest.ts`, `sw.ts`, `robots.ts`, `sitemap.ts`, and `storage/` stay outside `[locale]` since they aren't user-facing pages. Key files:

- `src/auth.ts` — NextAuth v5 config; email magic-link via Resend, Prisma adapter for session storage
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth route handler
- `src/components/AuthNav.tsx` — client component; renders login/logout nav based on session
- `src/components/SessionProvider.tsx` — wraps layout to expose `useSession`
- `prisma/schema.prisma` — user/auth tables (User, Account, Session, VerificationToken); shares the same PostgreSQL DB as Strapi but a separate Postgres schema (`public` for Prisma, `strapi` for Strapi — see `DATABASE_SCHEMA` in `docker-compose.yml`/`backend/config/database.ts`). This separation is critical: without it, Prisma's migration tooling treats Strapi's tables as unrecognized drift (see the `prisma migrate dev` warning above). **Local dev has this fixed as of 2026-07-15; production has not been migrated yet** — see Known Issues.

Auth flow: user enters email → Resend sends magic link → NextAuth creates session → new users redirected to `/profile/setup`.

### Backend (`backend/`)

Strapi 5 TypeScript CMS. Uses PostgreSQL in production, SQLite locally by default (set `DATABASE_CLIENT=postgres` to use Postgres).

- `config/database.ts` — switches between `postgres` and `sqlite` based on `DATABASE_CLIENT` env var
- `config/plugins.ts` — configures `strapi-plugin-meilisearch` for content search indexing

Content types are managed via the Strapi admin UI and stored under `src/api/`. Run `strapi develop` to auto-generate type definitions after schema changes.

**Strapi's scope is strictly editorial/static copy — never product data.** It currently owns three single-type pages: `about`, `privacy-policy`, `terms-of-service` (see `src/api/*/content-types/*/schema.json`, each just a `title` + markdown `body`). All product entities (Project, Organisation, User, and everything else under real platform features) live in Prisma/Postgres, never in Strapi — don't model new product concepts as Strapi content-types.

### Data flow

Frontend fetches editorial page content (About/Privacy/Terms) from Strapi via `NEXT_PUBLIC_STRAPI_URL` using `STRAPI_API_TOKEN` (`frontend/src/lib/strapi.ts`), falling back to hardcoded copy in the page component if Strapi has no published entry yet or is unreachable — so a fresh Strapi instance with empty content-types doesn't break these pages. Full-text search goes directly to Meilisearch from the browser using `NEXT_PUBLIC_MEILI_SEARCH_KEY` (read-only). Auth sessions are stored in PostgreSQL via Prisma (separate from Strapi's own tables).

## Product domain model

The sections above cover infra; this is a map of the actual product built on top of it, grown across many sessions — read `frontend/prisma/schema.prisma` for exact fields, this is just where to look. Product entities live entirely in Prisma (see Strapi's scope note above), organized around `Project` as the central entity:

- **Project lifecycle** — `Project.phase` (`ProjectPhase` enum: `IDEA → SPRINT → PILOT → PRODUCTION → ESTABLISH → SCALE → IMPACT`; note `SPRINT` was renamed from `PROJECT` — don't reuse the old name), rendered as a numbered journey widget (`PhaseJourneyWidget.tsx`). `Project.isSandbox` just flags a project as an experimental/playground one (the `/sandbox` area) — there is no separate sandbox data model; graduating out of sandbox is flipping the flag back to `false`. (An earlier chat-thread-based `Room.isSandbox`/`Room.origin` design was fully removed when Sandbox was rebuilt on real `Project` rows — don't resurrect those field names.)
- **Legal structure (PRD 4c)** — `Project.legalType` (`LegalType` enum: commercial paraply-AB/eget AB, ideellt paraply/egen förening), `CommercialUmbrellaEntity`, `LegalTypeChangeRequest` (member-voted, site-admin-executed transition).
- **Fork (PRD 4f)** — `Project.forkedFromProjectId`/`forks`, `ForkContributorCredit`/`ForkProfitShare`/`ForkTokenGrant` — a permissionless copy of any project, crediting and compensating the original's Tribe Token holders. (Forking a sandbox *thread* no longer exists as a concept — only forking a `Project`, sandbox or not.)
- **Tokens** — `TokenLedger` (Tribe Tokens, project-scoped) and `GtLedger` (GoodTribes Token, platform-wide, always a 10% mirror of a Tribe Token award — see `awardTokens` in `src/lib/tokens.ts`). `Poll`/`PollVote` are project-scoped and Tribe-Token-weighted; `PlatformPoll`/`PlatformPollVote` are platform-wide and GT-weighted (Granskningsrådet elections, Impact-fund allocation rounds).
- **Impact-fund & profit distribution (PRD 4a)** — `ProfitDistributionProposal` → member vote → `ProfitDistribution` (site-admin executed) → `PersonalProfitAllocation` per Tribe Token holder; `ImpactFundLedger`/`ImpactFundAllocationRound` for the fund's own in/out flow.
- **Granskningsrådet (PRD 2.97)** — `ReviewCouncilMember` (elected via `PlatformPoll`), `ExclusionCase`/`ExclusionCaseVote` for reported rule violations.
- **Idéflödet & Idéverkstaden (PRD 1.2/1.5)** — two separate, both still-live features: `Idea` (+ `IdeaRevision`/`IdeaContributor` co-creation, one-click promotion to a `Project`) is the public idea feed; `Room{type: IDEA_THREAD}` is Idéverkstaden's collaborative chat-based brainstorming, with an `@AI` participant and AI-generated `MindMap`s.
- **Scaling & partnerships (PRD Fas 4)** — `ProjectInstance` (regional franchise instances), `Partnership` (org↔project), `ProjectMaturity` (0-100 score driving the phase-advance prompt).
- **Feedback loop** — `Suggestion` (private free-text feedback, any logged-in user → `/suggestions`) triaged by site-admins at `/site-admin/suggestions`; separate from the public `Idea` feed and from `ContentFlag`'s moderation pipeline.
- **AI features** — every one is gated on `ANTHROPIC_API_KEY` and degrades gracefully (feature just unavailable, never a crash) when it's unset: mindmap generation, the AI kanban agent, project maturity/network-insight reports, task-estimate suggestions, Idéverkstaden's `@AI` participant, and the daily `sandbox-seed` cron that AI-generates new Sandbox `Project` rows to seed cold start.

All of the above ships through the same migration discipline and post-plan validation checklist described elsewhere in this file — there's no separate process for "product" vs "infra" changes.

## Post-plan validation (run after every plan is implemented)

After implementing any plan, always run this checklist in order:

```bash
# 1. TypeScript — must pass with zero errors
npx tsc --noEmit                          # run from frontend/

# 2. Tests — run if any exist
npm test --workspace=frontend --if-present

# 3. Docker build — must succeed for both services
docker compose build frontend
docker compose build backend              # skip if backend unchanged

# 4. Commit and push to main
git add <changed files>
git commit -m "<descriptive message>"
git push

# 5. Wait for GitHub Actions to go green
gh run watch                              # or: gh run list --limit 5
```

Do not consider a plan "done" until all Actions workflows pass on `main`.

## Deployment

CI/CD chain on push to `main`:
1. **Docker Publish** workflow builds and pushes `frontend` and `backend` images to `ghcr.io/goodtribes-org/goodtribes.org/{frontend,backend}:<sha>`
2. **Deploy To Production** workflow renders the Helm chart with the new image tags and commits the manifest to the `goodtribes-org/deploy` GitOps repo
3. ArgoCD/Flux on the cluster picks up the manifest change and rolls out the new pods

Sensitive production secrets live in a `goodtribes-secret` Kubernetes Secret in the `goodtribes` namespace — not in `chart/values.yaml`.

The Helm chart deploys: frontend, backend (Strapi), postgres, meilisearch, ingress for `goodtribes.org` / `www.goodtribes.org` via Traefik.

## Known issues

- **Live chat updates don't appear in production (`REDIS_URL` missing from `goodtribes-secret`).** The messaging feature uses Redis pub/sub (`frontend/src/lib/redis.ts`) so a sent message is pushed live over SSE (`frontend/src/app/api/rooms/[roomId]/sse/route.ts`) to everyone with that room open. Redis itself (`chart/templates/redis-deployment.yaml`/`redis-service.yaml`) was added to the chart, and `frontend-deployment.yaml` already does `envFrom: secretRef: goodtribes-secret` (same pattern as `DATABASE_URL`, `AUTH_SECRET`, etc.), but **no one has added a `REDIS_URL` key to the actual `goodtribes-secret` object in the cluster yet.** Until that's done, `process.env.REDIS_URL` is `undefined` in the frontend pods, so `publishToRoom()`/`subscribeToRoom()` fail silently (`.catch(() => {})`) — messages still save to Postgres, but nobody gets a live update; only a manual page reload shows new messages.
  - **Fix** (requires cluster access neither the agent nor the user had when this was found): add `REDIS_URL=redis://:<value of REDIS_PASSWORD>@goodtribes-redis:6379` to `goodtribes-secret` in the `goodtribes` namespace, then roll the frontend deployment (`kubectl rollout restart deployment/goodtribes-frontend -n goodtribes`, or trigger an ArgoCD sync).
  - There's no git-managed path for this (no Sealed Secrets / External Secrets Operator in the chart) — `goodtribes-secret` is a plain, manually-managed k8s Secret, so this can only be fixed by whoever provisioned the cluster/secret originally.

- **Production's Strapi tables still share the `public` Postgres schema with Prisma's (not yet fixed like local dev).** Local dev's Strapi container now runs with `DATABASE_SCHEMA=strapi` (`docker-compose.yml`), isolating it from Prisma's tables in `public` — this is what caused the 2026-07-15 full-database wipe (see the `prisma migrate dev` warning above) and needs the same fix in production. `chart/values.yaml` has **not** been updated with `DATABASE_SCHEMA: strapi` yet — doing so before migrating production's existing Strapi tables would make Strapi boot against an empty `strapi` schema and recreate everything from scratch, silently losing the production Strapi admin account and any published About/Privacy/Terms content.
  - **Fix** (requires production DB access neither the agent nor the user had when this was found): on the production Postgres, run `CREATE SCHEMA strapi;` then `ALTER TABLE <name> SET SCHEMA strapi;` for every Strapi-owned table (anything prefixed `up_`, `strapi_`, `admin_`, plus `files`, `upload_folders`, `i18n_locale`, `abouts`, `privacy_policies`, `terms_of_services`, and their `_lnk`/`_mph` join tables — see local dev's migration for the full list) — **before** adding `DATABASE_SCHEMA: strapi` to `chart/values.yaml` and deploying. Do this as one coordinated change, not two separate deploys.

- **Stripe env vars aren't yet in the production `goodtribes-secret`.** Crowdfunding (Utvecklingsfas 3, `frontend/src/app/api/stripe/**`) needs `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — these exist only in developers' local `.env` files today. `chart/values.yaml`'s `frontend.env` comment block documents them as expected-in-secret, and `.github/workflows/docker-image.yml` already threads `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` through as a Docker build ARG (it's build-time-inlined, so a runtime secretRef alone wouldn't reach the client bundle), but **nobody has added the actual values to `goodtribes-secret` or the `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` GitHub Actions repo secret yet.** Until that's done, `isStripeConfigured()` returns `false` in production and every funding campaign falls back to the manual-pledge path (donations/rewards tracked by hand, no real charges) — this is a graceful degradation, not a crash, but it means no real money moves until it's fixed.
  - **Fix** (requires cluster + GitHub repo access neither the agent nor the user had when this was found): add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to `goodtribes-secret` in the `goodtribes` namespace, add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` as a GitHub Actions repository secret (so the CI build-arg has a value), then roll the frontend deployment. Also register the production webhook endpoint (`https://goodtribes.org/api/stripe/webhook`) in the Stripe Dashboard once live, and use *that* endpoint's signing secret for `STRIPE_WEBHOOK_SECRET` — not the Stripe CLI's local-forwarding secret used in dev.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

GoodTribes.org — a platform connecting skilled volunteers with impact-driven organisations. This repo is the `goodtribes-org/goodtribes.org` GitHub repo (not the agent repo).

Stack: Next.js 16 (App Router) frontend + PostgreSQL + Meilisearch, deployed to Kubernetes via GitOps.

## Quick commands

```bash
# Docker (recommended — starts all services)
docker compose up --build
# Frontend → http://localhost:3000

# npm workspaces (requires services running separately)
npm run dev:services          # postgres + meilisearch only (docker)
npm run dev:frontend          # Next.js dev server (:3000)

# Build
npm run build:frontend

# Lint
npm run lint --workspace=frontend

# Prisma (run from repo root or frontend/)
npx --workspace=frontend prisma generate
npx --workspace=frontend prisma migrate deploy   # NEVER `prisma migrate dev` — see warning below
```

### ⚠️ Never run `prisma migrate dev` — it can wipe the whole database

`prisma migrate dev` diffs the *actual target database* against Prisma's migration history and will reset (drop + recreate) the schema if it sees anything it doesn't recognize as drift. On 2026-07-15 this happened for real: Strapi's tables (this repo ran a separate Strapi CMS backend at the time, since removed — see Known Issues) lived in the same `public` schema as Prisma's, Prisma saw them as unrecognized drift, and a non-interactive run of `migrate dev` went ahead and executed `DROP SCHEMA public CASCADE` without a real confirmation — wiping every table's data. There was no backup or seed script to restore it. Treat the rule as permanent regardless of what else changes in the schema — any unrecognized drift, from any source, can trigger the same reset.

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
NEXT_PUBLIC_MEILI_SEARCH_KEY=<public search key from Meilisearch>
```

## Architecture

### Frontend (`frontend/`)

Next.js 16 App Router SPA. Internationalized via `next-intl` — all page routes live under `src/app/[locale]/` (`sv` default, `en` also supported); `src/app/api/**`, `manifest.ts`, `sw.ts`, `robots.ts`, `sitemap.ts`, and `storage/` stay outside `[locale]` since they aren't user-facing pages. Key files:

- `src/auth.ts` — NextAuth v5 config; email magic-link via Resend, Prisma adapter for session storage
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth route handler
- `src/components/AuthNav.tsx` — client component; renders login/logout nav based on session
- `src/components/SessionProvider.tsx` — wraps layout to expose `useSession`
- `prisma/schema.prisma` — all product and auth tables (User, Account, Session, VerificationToken, and everything else), single `public` Postgres schema.

Auth flow: user enters email → Resend sends magic link → NextAuth creates session → new users redirected to `/profile/setup`.

**Editorial/static copy lives in the `SitePage` Prisma model** — one row per slug, edited in place via an inline pencil for site admins (`EditableSitePage.tsx`, gated on `isSiteAdmin()`), saved through `updateSitePage` in `site-pages-actions.ts` (sanitized via `sanitizeHtml()` both on save and at render time). This replaced a separate Strapi 5 CMS backend that used to own exactly this same scope — see Known Issues for the removal note. Don't model new product concepts as `SitePage` rows; it's strictly for this kind of static copy, same boundary Strapi used to enforce. Three slugs (`about`/`privacy`/`terms`) are fixed and keep their own routes (`/about`, `/privacy`, `/terms`) and default footer position even before a row exists (`frontend/src/lib/defaultSitePages.ts` fallback). Beyond those, a site admin can add/remove/reorder further pages inline from the footer (`FooterPageManager.tsx`, pencil next to "Utforska" — same ↑/↓ reorder pattern as the hero carousel editor); each new page gets a generated slug (`createFooterPage`, same pattern as `createWikiPage`) and renders at the generic `app/[locale]/pages/[slug]/page.tsx` route. The fixed three can be reordered but never removed from the footer.

### Data flow

Frontend reads About/Privacy/Terms from the `SitePage` table (`frontend/src/lib/sitePages.ts`'s `getSitePage`), falling back to hardcoded copy in `frontend/src/lib/defaultSitePages.ts` if no row exists yet for that slug — so these pages never break before a site admin has saved a first edit. Full-text search goes directly to Meilisearch from the browser using `NEXT_PUBLIC_MEILI_SEARCH_KEY` (read-only). Auth sessions are stored in PostgreSQL via Prisma.

## Product domain model

The sections above cover infra; this is a map of the actual product built on top of it, grown across many sessions — read `frontend/prisma/schema.prisma` for exact fields, this is just where to look. Product entities live entirely in Prisma (see the `SitePage` scope note above — that's the one exception, and it's strictly editorial copy, not product data), organized around `Project` as the central entity:

- **Project lifecycle** — `Project.phase` (`ProjectPhase` enum: `IDEA → SPRINT → PILOT → PRODUCTION → ESTABLISH → SCALE → IMPACT`; note `SPRINT` was renamed from `PROJECT` — don't reuse the old name), rendered as a numbered journey menu (`PhaseMenuBar.tsx`). `IDEA` and `SPRINT` are merged into a single visible "Idé" step everywhere (`frontend/src/lib/projectPhase.ts`'s `DISPLAY_PHASES`/`getChecklistForPhase`/`toDisplayPhase`) — the enum itself is untouched (no migration), `getNextPhase` just never routes a new advance through `SPRINT` anymore. `Project.isSandbox` just flags a project as an experimental/playground one (the `/sandbox` area) — there is no separate sandbox data model; graduating out of sandbox now goes through `SandboxGraduationRequest` (founder-applies, site-admin-decides, see Legal structure bullet below) rather than a self-serve flip. (An earlier chat-thread-based `Room.isSandbox`/`Room.origin` design was fully removed when Sandbox was rebuilt on real `Project` rows — don't resurrect those field names.)
- **Legal structure (PRD 4c)** — `Project.legalType` (`LegalType` enum: commercial paraply-AB/eget AB, ideellt paraply/egen förening) still has all 4 values, but project creation only offers the 2 "paraply" ones (`LEGAL_TYPES[].creatable` in `frontend/src/lib/legalType.ts`) — the other 2 remain reachable only via `LegalTypeChangeRequest` (member-voted, site-admin-executed transition). Every project starts in Sandbox and leaves it via `SandboxGraduationRequest` (founder-applies, site-admin-decides directly, no vote) — for commercial projects, approval simultaneously assigns a `CommercialUmbrellaEntity` and unlocks invoicing (`canInvoice()` in `frontend/src/lib/projectApproval.ts`), which also gates when `COMMERCIAL_AB` becomes proposable.
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

# 3. Docker build — must succeed
docker compose build frontend

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
1. **Docker Publish** workflow builds and pushes the `frontend` image to `ghcr.io/goodtribes-org/goodtribes.org/frontend:<sha>`
2. **Deploy To Production** workflow renders the Helm chart with the new image tag and commits the manifest to the `goodtribes-org/deploy` GitOps repo
3. ArgoCD/Flux on the cluster picks up the manifest change and rolls out the new pods

Sensitive production secrets live in a `goodtribes-secret` Kubernetes Secret in the `goodtribes` namespace — not in `chart/values.yaml`.

The Helm chart deploys: frontend, postgres, meilisearch, redis, minio, ingress for `goodtribes.org` / `www.goodtribes.org` via Traefik.

## Known issues

- ~~**Live chat updates don't appear in production (`REDIS_URL` missing from `goodtribes-secret`).**~~ **Fixed 2026-08-01.** The root cause was larger than "one missing key":
  - `REDIS_URL` was missing from `goodtribes-secret`, so `process.env.REDIS_URL` was `undefined` and ioredis silently fell back to `localhost:6379`, error-looping in every frontend pod.
  - `REDIS_PASSWORD` was **also** missing, and `redis-deployment.yaml` used `--requirepass "$(REDIS_PASSWORD)"`. Kubernetes only substitutes `$(VAR)` from a container's `env` list, **never from `envFrom`** — so the placeholder was passed through literally and Redis ran for 18 days with the literal string `$(REDIS_PASSWORD)` as its password. The exec probes had the same bug (`$(VAR)` is never expanded in probe commands at all), and only "passed" because they sent the same literal string.
  - **Fix applied:** `redis-deployment.yaml` now runs the server and both probes via `sh -c` so `$REDIS_PASSWORD` is expanded by the shell (which *does* see `envFrom` vars), and the probes `grep -q PONG` so a wrong password actually fails them. A real random `REDIS_PASSWORD` plus a matching `REDIS_URL` were added to `goodtribes-secret`.
  - Note for future work: `goodtribes-secret` is still a plain, manually-managed k8s Secret with no git-managed path (no Sealed Secrets / External Secrets Operator), so secret *values* remain a manual cluster operation even though the chart is now correct.

- **Strapi has been removed (2026-08-03).** The `backend/` service, its Helm templates, the `build-backend` CI job, and its `STRAPI_*` env vars are gone — About/Privacy/Terms now live in the `SitePage` Prisma model, editable inline via a site-admin pencil (see Data flow above). This also permanently closes the schema-collision risk described in the `prisma migrate dev` warning (Strapi's tables were what caused the 2026-07-15 full-database wipe). One loose end: **production's old Strapi tables (`up_*`, `strapi_*`, `admin_*`, `files`, `upload_folders`, `i18n_locale`, `abouts`, `privacy_policies`, `terms_of_services`, and their join tables) still physically exist in the `public` Postgres schema** — nothing reads or writes them anymore, but nobody has dropped them yet. Also, if production Strapi had real edited copy for About/Privacy/Terms beyond what's hardcoded in `defaultSitePages.ts`, that content was **not** migrated (neither the agent nor the user had production DB access when this was done) — a site admin should re-enter it via the new pencil UI once deployed, and once confirmed safe, `DROP TABLE` the orphaned Strapi tables.

- **Stripe env vars aren't yet in the production `goodtribes-secret`.** Crowdfunding (Utvecklingsfas 3, `frontend/src/app/api/stripe/**`) needs `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — these exist only in developers' local `.env` files today. `chart/values.yaml`'s `frontend.env` comment block documents them as expected-in-secret, and `.github/workflows/docker-image.yml` already threads `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` through as a Docker build ARG (it's build-time-inlined, so a runtime secretRef alone wouldn't reach the client bundle), but **nobody has added the actual values to `goodtribes-secret` or the `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` GitHub Actions repo secret yet.** Until that's done, `isStripeConfigured()` returns `false` in production and every funding campaign falls back to the manual-pledge path (donations/rewards tracked by hand, no real charges) — this is a graceful degradation, not a crash, but it means no real money moves until it's fixed.
  - **Fix** (requires cluster + GitHub repo access neither the agent nor the user had when this was found): add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to `goodtribes-secret` in the `goodtribes` namespace, add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` as a GitHub Actions repository secret (so the CI build-arg has a value), then roll the frontend deployment. Also register the production webhook endpoint (`https://goodtribes.org/api/stripe/webhook`) in the Stripe Dashboard once live, and use *that* endpoint's signing secret for `STRIPE_WEBHOOK_SECRET` — not the Stripe CLI's local-forwarding secret used in dev.

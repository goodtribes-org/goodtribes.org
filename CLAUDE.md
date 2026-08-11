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

**Editorial/static copy lives in the `SitePage` Prisma model** — one row per slug, edited in place via an inline pencil for site admins (`EditableSitePage.tsx`, gated on `isSiteAdmin()`), saved through `updateSitePage` in `site-pages-actions.ts` (sanitized via `sanitizeHtml()` both on save and at render time). This replaced a separate Strapi 5 CMS backend that used to own exactly this same scope — see Known Issues for the removal note. Don't model new product concepts as `SitePage` rows; it's strictly for this kind of static copy, same boundary Strapi used to enforce. Four slugs (`about`/`privacy`/`terms`/`code-of-conduct`) are fixed and keep their own routes (`/about`, `/privacy`, `/terms`, `/code-of-conduct`) and default footer position even before a row exists (`frontend/src/lib/defaultSitePages.ts` fallback). Beyond those, a site admin can add/remove/reorder further pages inline from the footer (`FooterPageManager.tsx`, pencil next to "Utforska" — same ↑/↓ reorder pattern as the hero carousel editor); each new page gets a generated slug (`createFooterPage`, same pattern as `createWikiPage`) and renders at the generic `app/[locale]/pages/[slug]/page.tsx` route. The fixed four can be reordered but never removed from the footer.

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

- **`CRON_SECRET` GitHub Actions repo secret is missing, so every externally-scheduled cron workflow fails (found 2026-08-06).** `sandbox-seed.yml`, `digest.yml`, `impact-fund-sweep.yml`, and `sprint-phase-advance.yml` all `curl` their `/api/cron/*` endpoint with `-H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"`. `gh secret list` shows only `DEPLOY_KEY` and `GHCR_PULL_SECRET` — no `CRON_SECRET` — so that header is always sent as `Bearer ` (empty). The run logs confirm this literally (`-H "Authorization: Bearer " \`) and every run fails with curl exit code 22 (HTTP error from `-f`), meaning production's `goodtribes-secret` **does** already have a real `CRON_SECRET` (`chart/values.yaml:28` documents it as expected-in-secret, and the in-cluster `github-sync-cronjob.yaml` template also reads it) — only the GitHub Actions side is missing, so these crons have likely never fired successfully.
  - **Fix** (requires cluster access to read the existing value, or coordinate setting a new one on both sides — see Mattias, cluster admin): `gh secret set CRON_SECRET` in this repo with the exact same value already in `goodtribes-secret`'s `CRON_SECRET` key. Don't generate a fresh value on the GitHub side alone — it has to match what the server checks against, or the same 401 loop continues.

- ~~**No backup existed for the Postgres database**~~ **Fixed 2026-08-11.** This was the exact gap that turned the 2026-07-15 `DROP SCHEMA public CASCADE` incident into unrecoverable data loss — there was a Deployment/PVC for Postgres but no backup job of any kind. Added `chart/templates/postgres-backup-cronjob.yaml`: a nightly (`0 3 * * *`, configurable via `postgresBackup.schedule`) CronJob that runs `pg_dump --format=custom` into a shared `emptyDir`, then uploads it to a new private `goodtribes-backups` MinIO bucket (created by `minio-init-job.yaml`, same pattern as the existing `goodtribes-public`/`goodtribes-private` buckets) and prunes dumps older than `postgresBackup.retentionDays` (default 14 days). Reuses the `POSTGRES_PASSWORD` and `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` keys already in `goodtribes-secret` — no new secret values needed, so this activates on the next Helm upgrade with no manual cluster step. Note for future work: this covers the *taking* of backups; nobody has run a restore drill (`pg_restore` from a bucket dump into a scratch database) against a real cluster yet, since restoring is exactly the kind of destructive-adjacent operation that should be verified deliberately rather than assumed to work. A site admin or cluster operator should do that drill once, and consider whether 14 days of on-cluster MinIO retention is enough or whether dumps should also be mirrored off-cluster.

- ~~**Stripe webhook trusted unsigned request bodies when `STRIPE_WEBHOOK_SECRET` was unset**~~ **Fixed 2026-08-11.** `frontend/src/app/api/stripe/webhook/route.ts` used to fall back to `JSON.parse(rawBody)` with no signature check at all when the webhook secret env var was missing — intended as a local-dev convenience, but since `STRIPE_WEBHOOK_SECRET` is (per the entry above) not yet set in production, this meant the moment `STRIPE_SECRET_KEY` alone got added to `goodtribes-secret` — a plausible partial rollout, the same shape as the `CRON_SECRET` incident — the webhook would become a fully unauthenticated endpoint: anyone could POST a fake `checkout.session.completed` with an attacker-chosen `campaignId`/`userId`/`amount` and mint real `TokenLedger`/`GtLedger` tokens. The route now returns `503` immediately whenever `STRIPE_WEBHOOK_SECRET` is unset, with no unsigned-body fallback in any environment — local development needs a real webhook secret too (e.g. from `stripe listen`), matching the guidance already in the Stripe entry above about using the right secret per environment.

- **Six high-severity gaps from a 2026-08-11 code review (security/scalability/stability), fixed the same day:**
  - **Cron endpoints fail-open without `CRON_SECRET`.** `/api/cron/{digest,sandbox-seed,sprint-phase-advance,impact-fund-sweep}` used `if (secret) { check }`, so a missing env var skipped auth entirely instead of rejecting the request — only `/api/cron/github-sync` failed closed. All four now return `503` when `CRON_SECRET` is unset, matching `github-sync`. Production already has a real `CRON_SECRET` (see the entry above), so this wasn't actively exploited there, but it was live in any environment without the var set.
  - **Poll voting/creation had no project-membership check.** `frontend/src/app/[locale]/projects/[slug]/(workspace)/polls/actions.ts`'s `createPoll` and `castVote` let any logged-in user create or vote on any project's poll, and a non-member's token balance floored to 1 vote (`Math.max(sum, 1)`) rather than being blocked outright. Both now require `isRealMember(project.id, userId)` — the same membership gate used everywhere else in the codebase (kanban, lean-canvas, legal-type, sprints) — before doing anything else.
  - **Kanban card moves had no project-membership check (IDOR / token-theft path).** `moveKanbanCard` (`frontend/src/lib/kanbanMove.ts`, shared by both `/api/kanban/move` and the `moveCard` server action) let any logged-in user move any project's cards, and applied `overrides.assigneeId`/`subtaskCompletedBy` — which decide who gets paid when a card lands in Done — with no validation. Fixed with the same `isRealMember(...) || isCardClaimant(...)` gate used elsewhere for card mutations, plus a check that every override target is an actual (non-`FOLLOWER`) project member before any token payout uses it.
  - **A successful PR build could push a broken image reference to production.** `.github/workflows/deploy.yaml`'s `workflow_run` trigger only checked `conclusion == 'success'`, not which event triggered the Docker Publish run. Since PR builds never push the image to `ghcr.io` (`docker-image.yml`'s `push: ${{ github.event_name != 'pull_request' }}`), a green PR build would still fire Deploy and commit a manifest pointing at a tag that doesn't exist. Now guarded with `&& github.event.workflow_run.event != 'pull_request'`.
  - **`/api/maturity` crashed without `ANTHROPIC_API_KEY`.** `new Anthropic()` was constructed unconditionally (and outside the `try` block) whenever a project's score crossed 70 with no scaling plan yet — the SDK throws synchronously at construction with no key, so this broke the whole scoring endpoint in any environment without the key, contradicting the "AI features degrade, never crash" rule every other AI route follows. Now gated on `process.env.ANTHROPIC_API_KEY` like the rest.
  - **`/api/meili-sync` triggered a full, unpaginated reindex for any logged-in user.** No caller in the codebase actually uses this route (it predates being wired to anything), so it was reachable by any authenticated account to force an expensive `findMany` over every project/idea/user and push it all to Meilisearch — a login-gated but otherwise open, spammable full-reindex endpoint. Now requires site-admin, or (for a future scheduled resync) the same `CRON_SECRET` bearer convention as `/api/cron/*`. The underlying pagination/incremental-indexing scalability issue is unchanged — this fix is authorization-only.

- **Eight medium-severity findings from the same 2026-08-11 code review, fixed 2026-08-11:**
  - **Hero carousel had no HTML sanitization (stored XSS).** `createHeroSlide`/`updateHeroSlide` (`frontend/src/app/[locale]/home-hero-actions.ts`) saved `body`/`outro` unsanitized, and `HeroPhotoStack.tsx` renders them via `dangerouslySetInnerHTML` with no render-time sanitization either — unlike `SitePage`, which sanitizes both ways. Now sanitized on save (`toData()`) and again at render (`toHeroSlideData()` in `frontend/src/lib/heroSlides.ts`), matching the `SitePage` pattern; the render-time pass also cleans any rows saved before this fix.
  - **No CI gate before Docker build/deploy.** `.github/workflows/docker-image.yml` went straight to `docker build` with no lint or test step, even though Jest tests existed and were never run by CI. Added `npm ci`, `prisma generate`, `npm run lint`, and `npm test` steps before the build. This required actually fixing the pre-existing lint state first: 16 real `@typescript-eslint/no-unused-vars` errors (dead code removed, a few renamed to `_prefix` per this repo's ignore-pattern convention) and 7 dangling `eslint-disable-next-line react-hooks/exhaustive-deps`/`@next/next/no-img-element` comments referencing plugins this project's flat `eslint.config.mjs` never actually loads (removed — they were suppressing nothing, since ESLint 9 hard-errors on a disable comment for an unregistered rule rather than silently ignoring it). Follow-up not done here: this repo's ESLint config has no Next.js/React-hooks plugin wired in at all, unusual for a Next.js App Router project — worth a dedicated pass to add `eslint-plugin-react-hooks` properly rather than leaving those rules permanently unenforced.
  - **Money-moving cron loops and Stripe checkout had no per-item error isolation.** `impact-fund-sweep` and `sprint-phase-advance` looped over many rows with no try/catch around each iteration — one bad row threw and aborted the whole batch mid-way, silently leaving the rest for next run with no record of the partial failure. Both now wrap each row individually, log the failure, and return a `failed: string[]` list in the response. `stripe/checkout`'s `stripe.checkout.sessions.create` call had no try/catch either; now returns a `502` with the Stripe error message instead of an unhandled exception.
  - **Cron curl calls had no timeout.** All four GitHub Actions cron workflows plus the in-cluster `github-sync-cronjob.yaml` now pass `--max-time` (120s for the GitHub Actions ones, 240s for the in-cluster board sync) so a hung request fails the job cleanly instead of running until the runner/pod's own timeout.
  - **AI-feature gating (`ANTHROPIC_API_KEY` check) was reimplemented ad hoc 8+ times.** Extracted `isAiEnabled()`/`getAnthropicClient()` into `frontend/src/lib/anthropic.ts` and switched every AI call site (`ai-agent`, `ai-agent/review`, `mindmap/generate`, `maturity`, `maturity/report`, `network-insights`, `cron/sandbox-seed`, `taskEstimate.ts`, `aiThreadReply.ts`, `claude.ts`) to it — one place to get this right instead of nine, which is exactly why `/api/maturity`'s crash (see above) was possible in the first place.
  - **The site-admin `requireAdmin()` session+role check was copy-pasted in 9 separate `*-actions.ts` files** (byte-identical in 5, a trivial variant in 4). Extracted as `requireAdminSession()` in `frontend/src/lib/authz.ts`; all 9 files now import it instead of redefining it.
  - **`githubSync.ts` synced board items with N sequential Prisma round-trips and no overlap protection.** `syncProjectBoard`'s per-item create/update loop now prepares each item's data synchronously (preserving board-order `order` assignment) and fires the writes concurrently via `Promise.allSettled` — same per-item failure isolation as before (one bad item still can't abort the rest), just without paying for N sequential round-trips. `syncAllProjectBoards` (only caller: the 5-minute cron) now takes a Redis lock (`lock:github-sync`, TTL matching `MIN_SYNC_INTERVAL_MS`) so a slow pass can't overlap with the next tick; the Redis import is lazy (inside the lock function only) specifically so importing this module's plain helpers (`assertNotGithubCard` etc., used from unrelated kanban code) never opens a Redis connection as a side effect — an earlier version of this fix did that eagerly and made the Jest suite hang trying to connect to a Redis that isn't running in CI/test environments.
  - **Not fixed — deferred, needs a live environment to do safely:** two findings from the same review were left alone rather than attempted blind. (1) ~19 `status String @default("pending")` fields in `schema.prisma` that should be real Prisma enums — converting them needs the `prisma migrate diff --shadow-database-url` workflow this repo requires (see the `migrate dev` warning above), which needs a reachable Postgres this sandboxed session didn't have; guessing at hand-written migration SQL for a money/governance-adjacent set of columns without validating the diff against a real shadow database was judged too risky. (2) Adding caching (`revalidate`/`unstable_cache`) to the heavy list pages (`projects`, `ideas`, `members`, `dashboard`) — all four are already explicitly `export const dynamic = "force-dynamic"` because they read `searchParams` and personalize via `auth()` (dashboard especially: caching a per-user page across users would leak one user's data to another), so this needs a surgical per-query `unstable_cache` design plus real browser testing against a running app, not a blanket page-level `revalidate` export.

- **Five low-severity findings from the same 2026-08-11 code review, fixed 2026-08-11:**
  - **Wiki markdown fallback had no HTML-escaping.** The plain-text/markdown-lite renderer in `frontend/src/app/[locale]/projects/[slug]/(workspace)/wiki/[pageSlug]/page.tsx` interpolated raw line content into hand-built HTML tags with no escaping — not currently exploitable (every write path already runs `sanitizeHtml()` first) but a landmine for any future write path that skips that step. Now escapes via the existing `escapeHtml()` helper (`frontend/src/lib/renderBody.tsx`) as defense-in-depth, independent of what any upstream write path does.
  - **`ActivityEvent` was missing an index on `projectId`.** Had `@@index([organisationId])` but not `@@index([projectId])`, despite `lib/activityFeed.ts` filtering directly on it — added via a hand-crafted migration (`prisma/migrations/20260811160000_activity_event_project_index`), since this is additive-only DDL (`CREATE INDEX`) and didn't need the shadow-database diff workflow the riskier enum conversion above does.
  - **No autoscaling or resource limits on the frontend Deployment**, relevant given long-lived SSE connections (chat, kanban live-sync) have no connection-level backpressure under a fixed replica count. Added an opt-in `frontend.autoscaling` block in `chart/values.yaml` (default `enabled: false` — untested resource-request guesses shouldn't become the production default without a human picking real values and confirming metrics-server is present) plus `chart/templates/frontend-hpa.yaml`. When off, the chart renders byte-for-byte what it did before; when on, the Deployment's `replicas` field is omitted (HPA owns it) and `resources` is applied.
  - **A large chunk of the app mixed hardcoded Swedish and English UI copy outside next-intl**, not just the two examples the review named (`mentors` pages, the project `edit` page) — a full sweep found and fixed ~35 pages across the app (member workspace pages, site-admin tooling, Granskningsrådet, onboarding, search, settings, academy, the impact fund, mentors, invites, and more), adding matching keys to both `messages/sv.json` and `messages/en.json` (kept in sync — same 222 namespaces, zero key mismatches, verified by script). Left alone: pages backed by the `SitePage` model (about/privacy/terms/code-of-conduct/participant-agreement/custom footer pages) — those are correctly localized already, just via `DEFAULT_SITE_PAGES[locale]` instead of next-intl, per this file's own documented architecture — and pure redirect pages with no rendered text.
  - **God files** (`projects/[slug]/page.tsx` at ~1050 lines, `KanbanCardModal.tsx` at 800): extracted the page's self-contained `MiniCalendar` component into its own file (~65 lines moved, zero behavior change, safe because it's pure presentational with no data-fetching). Did not attempt further extraction on either file: `page.tsx`'s remaining ~900-line function tightly threads fetched data through one large JSX tree with no other clean seams, and `KanbanCardModal.tsx` is a stateful client component where a wrong prop/closure split would cause a silent interactive bug — neither is safely verifiable without a live browser session against a running app, which this sandboxed pass didn't have.

- **TODO — concurrent-user capacity: three follow-ups identified 2026-08-11, not yet started.** Today's setup (single frontend replica, no caching on the heavy list pages, default Prisma connection pooling) likely tops out somewhere in the tens-to-low-hundreds of concurrent active users before degrading — an architectural estimate, not a load-tested number. In priority order:
  1. **Turn on `frontend.autoscaling.enabled` in `chart/values.yaml`** (the opt-in HPA + resource requests/limits added above) and have a cluster operator pick real CPU/memory values from actual node capacity, after confirming `metrics-server` is present.
  2. **Set an explicit Prisma `connection_limit` on `DATABASE_URL`** before doing #1. Prisma sizes its pool as `CPU count × 2 + 1`, and that CPU count is sometimes read from the node rather than the container's cgroup limit — so scaling to N frontend pods without this can multiply toward Postgres's `max_connections` (default 100) faster than expected, turning a graceful slowdown into hard "too many connections" errors. This needs verifying against the actual node/pod CPU visibility in-cluster, not something to hardcode blind.
  3. **Add caching (`unstable_cache`, tag-based invalidation) to the heavy list pages** (`projects`, `ideas`, `members`) — see the deferred caching note above for why this needs a surgical per-query design and real browser testing rather than a blanket `revalidate` export. This is what makes #1 actually pay off instead of just moving the bottleneck to Postgres sooner.

  None of these three have been implemented yet — they need either cluster access (to pick resource values and confirm metrics-server) or a running app to browser-test the caching change against, neither of which this sandboxed session has had throughout.

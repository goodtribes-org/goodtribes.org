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
npx --workspace=frontend prisma migrate dev
```

## Environment setup

Copy `.env.example` to `.env` in the repo root. Required additions beyond the example for local dev:

```
AUTH_SECRET=<any random string>
RESEND_API_KEY=<from resend.com>
STRAPI_API_TOKEN=<generate in Strapi admin after first run>
NEXT_PUBLIC_MEILI_SEARCH_KEY=<public search key from Meilisearch>
```

## Architecture

### Frontend (`frontend/`)

Next.js 16 App Router SPA. No i18n (content is Swedish). Key files:

- `src/auth.ts` — NextAuth v5 config; email magic-link via Resend, Prisma adapter for session storage
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth route handler
- `src/components/AuthNav.tsx` — client component; renders login/logout nav based on session
- `src/components/SessionProvider.tsx` — wraps layout to expose `useSession`
- `prisma/schema.prisma` — user/auth tables (User, Account, Session, VerificationToken); shares the same PostgreSQL DB as Strapi but separate schemas

Auth flow: user enters email → Resend sends magic link → NextAuth creates session → new users redirected to `/profile/setup`.

### Backend (`backend/`)

Strapi 5 TypeScript CMS. Uses PostgreSQL in production, SQLite locally by default (set `DATABASE_CLIENT=postgres` to use Postgres).

- `config/database.ts` — switches between `postgres` and `sqlite` based on `DATABASE_CLIENT` env var
- `config/plugins.ts` — configures `strapi-plugin-meilisearch` for content search indexing

Content types are managed via the Strapi admin UI and stored under `src/api/`. Run `strapi develop` to auto-generate type definitions after schema changes.

### Data flow

Frontend fetches CMS content from Strapi via `NEXT_PUBLIC_STRAPI_URL` using `STRAPI_API_TOKEN`. Full-text search goes directly to Meilisearch from the browser using `NEXT_PUBLIC_MEILI_SEARCH_KEY` (read-only). Auth sessions are stored in PostgreSQL via Prisma (separate from Strapi's own tables).

## Deployment

CI/CD chain on push to `main`:
1. **Docker Publish** workflow builds and pushes `frontend` and `backend` images to `ghcr.io/goodtribes-org/goodtribes.org/{frontend,backend}:<sha>`
2. **Deploy To Production** workflow renders the Helm chart with the new image tags and commits the manifest to the `goodtribes-org/deploy` GitOps repo
3. ArgoCD/Flux on the cluster picks up the manifest change and rolls out the new pods

Sensitive production secrets live in a `goodtribes-secret` Kubernetes Secret in the `goodtribes` namespace — not in `chart/values.yaml`.

The Helm chart deploys: frontend, backend (Strapi), postgres, meilisearch, ingress for `goodtribes.org` / `www.goodtribes.org` via Traefik.

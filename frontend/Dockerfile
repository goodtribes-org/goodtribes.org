# Node 22 (Active LTS), not the 25 Dependabot proposed in #37 — 25 is a
# non-LTS "Current" release with no long-term support window, while 22 is
# the actual minimum this app's dependencies need: isomorphic-dompurify
# 3.22+ (see its "engines" field) dropped Node 20 support entirely,
# requiring ^22.22.2 at minimum.
#
# Pinned to a digest instead of the mutable `22-alpine` tag so a rebuild
# always gets the exact same base image (supply-chain reproducibility) —
# kept in sync going forward via Dependabot's docker ecosystem (see
# .github/dependabot.yml). Bump both the tag comment and the digest
# together when Dependabot opens a PR for this.
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY frontend/package.json ./package.json
RUN npm install --legacy-peer-deps

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ .
ENV NODE_ENV=production
# Next.js inlines NEXT_PUBLIC_* vars into the client bundle at build time, not
# runtime — a plain docker-compose/Helm env var arriving after this point is
# too late, so it must come in as a build ARG here instead.
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RUN npx prisma generate
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install prisma CLI v7 locally (NOT globally) for running migrations at
# startup — must match the @prisma/client/prisma versions pinned in
# package.json (7.9.1), since a mismatched CLI/client major version is
# exactly the kind of drift Prisma warns against.
#
# A global `npm install -g` (Prisma 6's approach here) breaks in Prisma 7:
# prisma.config.ts does `import { defineConfig } from "prisma/config"`, and
# when the CLI loads that file, Node resolves that bare specifier relative
# to prisma.config.ts's own location (/app), not the CLI's install
# location — a global install never lands on /app's module resolution path,
# so the config load fails with "Cannot find module 'prisma/config'". A
# plain local install puts `prisma` in /app/node_modules, which both fixes
# that resolution and is what `npx prisma migrate deploy` in entrypoint.sh
# picks up automatically (npx checks ./node_modules/.bin first).
RUN npm install prisma@7.9.1 --no-save

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Prisma 7 moved the datasource URL out of schema.prisma and into
# prisma.config.ts (see that file's own comments) — entrypoint.sh's
# `prisma migrate deploy` needs this file present at /app (the CLI resolves
# the schema/migrations paths relative to it) or it fails to load any config.
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/entrypoint.sh ./entrypoint.sh

RUN chmod +x /app/entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/bin/sh", "/app/entrypoint.sh"]

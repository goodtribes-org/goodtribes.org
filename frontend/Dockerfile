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
FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS base

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

# Install prisma CLI v6 for running migrations at startup
RUN npm install -g prisma@6

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/entrypoint.sh ./entrypoint.sh

RUN chmod +x /app/entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/bin/sh", "/app/entrypoint.sh"]

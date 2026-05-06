FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# Build
FROM base AS builder
RUN apk add --no-cache vips-dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Runner
FROM base AS runner
RUN apk add --no-cache vips-dev
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 strapi
RUN adduser --system --uid 1001 strapi

COPY --from=builder --chown=strapi:strapi /app ./

USER strapi

EXPOSE 1337
CMD ["npm", "run", "start"]

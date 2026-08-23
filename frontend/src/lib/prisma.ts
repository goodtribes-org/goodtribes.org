import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Prisma opens an uncapped connection pool per instance by default. Fine at
// replicaCount: 1, but dangerous once the frontend HPA (chart/values.yaml
// frontend.autoscaling) is turned on — N replicas each opening an unbounded
// pool can exhaust Postgres's max_connections (100 by default) well before
// any single instance is actually under load. DATABASE_CONNECTION_LIMIT lets
// ops tune per-instance pool size without a code change; the default (10)
// keeps today's HPA ceiling (5 replicas) under 50 total connections.
function withConnectionLimit(url: string): string {
  if (!url || url.includes("connection_limit")) return url
  const separator = url.includes("?") ? "&" : "?"
  const limit = process.env.DATABASE_CONNECTION_LIMIT ?? "10"
  return `${url}${separator}connection_limit=${limit}`
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: withConnectionLimit(process.env.DATABASE_URL ?? "") } },
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

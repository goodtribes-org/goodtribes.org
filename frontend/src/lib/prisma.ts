import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Prisma opens an uncapped connection pool per instance by default. Fine at
// replicaCount: 1, but dangerous once the frontend HPA (chart/values.yaml
// frontend.autoscaling) is turned on — N replicas each opening an unbounded
// pool can exhaust Postgres's max_connections (100 by default) well before
// any single instance is actually under load. DATABASE_CONNECTION_LIMIT lets
// ops tune per-instance pool size without a code change; the default (10)
// keeps today's HPA ceiling (5 replicas) under 50 total connections.
//
// Prisma 6 read this off a `connection_limit` query-string param on
// DATABASE_URL, handled by Prisma's own (Rust) engine. Prisma 7's
// driver-adapter architecture hands pooling to `pg` (node-postgres) instead,
// which never parses that param — pg.Pool only understands its own `max`
// option — so the limit is now passed straight into PrismaPg's pool config
// below rather than tacked onto the URL.
function getConnectionLimit(): number {
  const raw = Number(process.env.DATABASE_CONNECTION_LIMIT ?? "10")
  return Number.isFinite(raw) && raw > 0 ? raw : 10
}

// Prisma 7 removed the `datasources.{db}.url` constructor override — the
// schema file can no longer carry a `url` at all (see schema.prisma's
// datasource block and prisma.config.ts), and the runtime client now needs
// an explicit driver adapter instead. `@prisma/adapter-pg` wraps `node-postgres`
// and is where both the connection string and the pool-size tuning above
// actually get passed in.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
  max: getConnectionLimit(),
})

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

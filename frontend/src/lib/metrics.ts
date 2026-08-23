import { Registry, collectDefaultMetrics } from "prom-client"

const globalForMetrics = globalThis as unknown as { metricsRegistry?: Registry }

// Singleton across module reloads (same pattern as prisma.ts/redis.ts) —
// collectDefaultMetrics() throws "metric already registered" if called more
// than once against the same registry, which dev's hot-reload would trigger
// on every edit without this guard.
export const metricsRegistry = globalForMetrics.metricsRegistry ?? new Registry()

if (!globalForMetrics.metricsRegistry) {
  collectDefaultMetrics({ register: metricsRegistry })
  globalForMetrics.metricsRegistry = metricsRegistry
}

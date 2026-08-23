import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { redisPub } from "@/lib/redis"
import { logger } from "@/lib/logger"

// Backs the k8s readiness/liveness probes (chart/templates/frontend-deployment.yaml).
// Unlike the old "/" probe, this actually exercises the DB and Redis
// connections a real request depends on, so a broken pool or unreachable
// Redis gets the pod pulled from rotation instead of serving 500s.
const CHECK_TIMEOUT_MS = 2000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("health check timed out")), ms)
    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (err) => { clearTimeout(timer); reject(err) }
    )
  })
}

export async function GET() {
  const [db, redis] = await Promise.allSettled([
    withTimeout(prisma.$queryRaw`SELECT 1`, CHECK_TIMEOUT_MS),
    withTimeout(redisPub.ping(), CHECK_TIMEOUT_MS),
  ])

  const healthy = db.status === "fulfilled" && redis.status === "fulfilled"
  if (!healthy) {
    logger.warn("health check degraded", {
      db: db.status,
      redis: redis.status,
      dbError: db.status === "rejected" ? String(db.reason) : undefined,
      redisError: redis.status === "rejected" ? String(redis.reason) : undefined,
    })
  }

  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", db: db.status, redis: redis.status },
    { status: healthy ? 200 : 503 }
  )
}

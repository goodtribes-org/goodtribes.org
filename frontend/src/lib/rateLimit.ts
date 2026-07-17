import { redisPub } from "@/lib/redis";

// Fixed-window counter: INCR then EXPIRE only on the first hit in the window.
// Fails open (returns true = allowed) on any Redis error, matching the
// .catch(() => {}) fail-open convention already used elsewhere in redis.ts —
// a Redis outage should degrade to "no rate limiting", not "site is down".
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const count = await redisPub.incr(key);
    if (count === 1) await redisPub.expire(key, windowSeconds);
    return count <= limit;
  } catch {
    return true;
  }
}

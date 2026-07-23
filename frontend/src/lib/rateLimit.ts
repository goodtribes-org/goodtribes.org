import { redisPub } from "@/lib/redis";

// ioredis's default retry behaviour (maxRetriesPerRequest: 20, growing
// backoff) means a single command can take 15-30s to reject when Redis is
// unreachable — observed directly against this dev environment (no Redis
// configured) and matches the missing-REDIS_URL production gap documented
// in CLAUDE.md's Known Issues. Left unbounded, that turns "fail open" into
// "every rate-limited action hangs for ~20s" — worse than no rate limiting
// at all. Race against a short timeout so a Redis outage degrades instantly,
// same fail-open intent as the .catch(() => {}) convention in redis.ts.
const CHECK_TIMEOUT_MS = 250;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("rate limit check timed out")), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

// Fixed-window counter: INCR then EXPIRE only on the first hit in the window.
// Fails open (returns true = allowed) on any Redis error or timeout, matching
// the .catch(() => {}) fail-open convention already used elsewhere in
// redis.ts — a Redis outage should degrade to "no rate limiting", not "site
// is down" or "every action hangs".
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const count = await withTimeout(
      (async () => {
        const c = await redisPub.incr(key);
        if (c === 1) await redisPub.expire(key, windowSeconds);
        return c;
      })(),
      CHECK_TIMEOUT_MS
    );
    return count <= limit;
  } catch {
    return true;
  }
}

/**
 * Rate limiter — Upstash Redis in production, in-memory fallback in dev.
 *
 * Production: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN env vars.
 * Development: falls back to an in-process Map (resets on server restart).
 */

// ── In-memory fallback ────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

if (typeof globalThis !== "undefined") {
  const cleanup = () => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap) {
      if (now > value.resetAt) rateLimitMap.delete(key);
    }
  };
  setInterval(cleanup, 60_000);
}

function inMemoryRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count };
}

// ── Upstash Redis rate limiter (lazy-init) ────────────────────────────────────

let upstashRatelimit: ReturnType<typeof import("@upstash/ratelimit").Ratelimit.slidingWindow> | null =
  null;
let UpstashRatelimitClass: typeof import("@upstash/ratelimit").Ratelimit | null = null;
let upstashRedis: import("@upstash/redis").Redis | null = null;

async function getUpstash() {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }

  if (!UpstashRatelimitClass) {
    const [{ Ratelimit }, { Redis }] = await Promise.all([
      import("@upstash/ratelimit"),
      import("@upstash/redis"),
    ]);
    UpstashRatelimitClass = Ratelimit;
    upstashRedis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    // Default instance isn't used directly — we create per-call instances below
    upstashRatelimit = Ratelimit.slidingWindow(5, "15 m");
  }

  return { Ratelimit: UpstashRatelimitClass!, redis: upstashRedis! };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * @param identifier  Unique key, e.g. `rfq:${ip}`
 * @param limit       Max requests allowed in the window
 * @param windowMs    Window in milliseconds (used for in-memory fallback)
 * @param windowStr   Upstash window string, e.g. "15 m", "1 m", "30 m"
 */
export async function rateLimit(
  identifier: string,
  limit: number = 5,
  windowMs: number = 15 * 60 * 1000,
  windowStr: string = "15 m"
): Promise<{ success: boolean; remaining: number }> {
  const upstash = await getUpstash();

  if (upstash) {
    const { Ratelimit, redis } = upstash;
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, windowStr as Parameters<typeof Ratelimit.slidingWindow>[1]),
      prefix: "rl",
    });
    const result = await limiter.limit(identifier);
    return { success: result.success, remaining: result.remaining };
  }

  // Fallback to in-memory
  return inMemoryRateLimit(identifier, limit, windowMs);
}

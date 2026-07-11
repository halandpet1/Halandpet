const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

export type RateLimitOptions = {
  max: number;
  windowMs: number;
};

export async function checkRateLimit(key: string, limitOrOptions: number | RateLimitOptions, windowMs?: number): Promise<RateLimitResult> {
  const options = typeof limitOrOptions === 'number' ? { max: limitOrOptions, windowMs: windowMs ?? 60_000 } : limitOrOptions;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + options.windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(options.max - 1, 0), retryAfterMs: 0 };
  }

  if (entry.count >= options.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(entry.resetAt - now, 0),
    };
  }

  entry.count += 1;
  return { allowed: true, remaining: Math.max(options.max - entry.count, 0), retryAfterMs: 0 };
}

export function clearRateLimit(key: string) {
  rateLimitStore.delete(key);
}

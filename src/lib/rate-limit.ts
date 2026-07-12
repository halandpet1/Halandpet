import { db } from '@/lib/db';

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

  if (!db) {
    return { allowed: true, remaining: options.max, retryAfterMs: 0 };
  }

  const rateLimitClient = (db as unknown as { rateLimitEntry?: { findUnique: (args: { where: { key: string }; select: { id: true; count: true; resetAt: true } }) => Promise<{ id: string; count: number; resetAt: Date } | null>; upsert: (args: { where: { key: string }; update: { count: number; resetAt: Date }; create: { key: string; count: number; resetAt: Date } }) => Promise<unknown>; update: (args: { where: { key: string }; data: { count: number } }) => Promise<unknown>; delete: (args: { where: { key: string } }) => Promise<unknown> } }).rateLimitEntry;
  if (!rateLimitClient) {
    return { allowed: true, remaining: options.max, retryAfterMs: 0 };
  }

  const now = Date.now();
  const resetAt = new Date(now + options.windowMs);

  try {
    const existing = await rateLimitClient.findUnique({ where: { key }, select: { id: true, count: true, resetAt: true } });
    if (!existing || existing.resetAt.getTime() <= now) {
      await rateLimitClient.upsert({
        where: { key },
        update: { count: 1, resetAt },
        create: { key, count: 1, resetAt },
      });

      return { allowed: true, remaining: Math.max(options.max - 1, 0), retryAfterMs: 0 };
    }

    if (existing.count >= options.max) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(existing.resetAt.getTime() - now, 0),
      };
    }

    await rateLimitClient.update({
      where: { key },
      data: { count: existing.count + 1 },
    });

    return { allowed: true, remaining: Math.max(options.max - (existing.count + 1), 0), retryAfterMs: 0 };
  } catch {
    return { allowed: true, remaining: options.max, retryAfterMs: 0 };
  }
}

export async function clearRateLimit(key: string) {
  if (!db) return;

  const rateLimitClient = (db as unknown as { rateLimitEntry?: { delete: (args: { where: { key: string } }) => Promise<unknown> } }).rateLimitEntry;
  if (!rateLimitClient?.delete) return;

  await rateLimitClient.delete({ where: { key } }).catch(() => undefined);
}

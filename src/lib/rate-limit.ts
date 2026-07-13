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

type MemoryRateLimitEntry = {
  count: number;
  resetAt: Date;
};

type GlobalRateLimitStore = {
  __halandpetRateLimitStore?: Map<string, MemoryRateLimitEntry>;
};

const globalRateLimitStore = (globalThis as unknown as GlobalRateLimitStore).__halandpetRateLimitStore ?? new Map<string, MemoryRateLimitEntry>();
(globalThis as unknown as GlobalRateLimitStore).__halandpetRateLimitStore = globalRateLimitStore;

type RateLimitClient = {
  findUnique: (args: { where: { key: string }; select: { id: true; count: true; resetAt: true } }) => Promise<{ id: string; count: number; resetAt: Date } | null>;
  upsert: (args: { where: { key: string }; update: { count: number; resetAt: Date }; create: { key: string; count: number; resetAt: Date } }) => Promise<unknown>;
  update: (args: { where: { key: string }; data: { count: number } }) => Promise<unknown>;
  delete: (args: { where: { key: string } }) => Promise<unknown>;
};

function getMemoryRateLimitEntry(key: string, now: number) {
  const entry = globalRateLimitStore.get(key);
  if (!entry) {
    return null;
  }

  if (entry.resetAt.getTime() <= now) {
    globalRateLimitStore.delete(key);
    return null;
  }

  return entry;
}

function getMemoryRateLimitResult(key: string, options: RateLimitOptions, now: number) {
  const current = getMemoryRateLimitEntry(key, now);
  if (!current) {
    const resetAt = new Date(now + options.windowMs);
    globalRateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(options.max - 1, 0), retryAfterMs: 0 };
  }

  if (current.count >= options.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(current.resetAt.getTime() - now, 0),
    };
  }

  const nextCount = current.count + 1;
  globalRateLimitStore.set(key, { ...current, count: nextCount });
  return { allowed: true, remaining: Math.max(options.max - nextCount, 0), retryAfterMs: 0 };
}

export async function checkRateLimit(key: string, limitOrOptions: number | RateLimitOptions, windowMs?: number): Promise<RateLimitResult> {
  const options = typeof limitOrOptions === 'number' ? { max: limitOrOptions, windowMs: windowMs ?? 60_000 } : limitOrOptions;
  const now = Date.now();

  if (!db) {
    return getMemoryRateLimitResult(key, options, now);
  }

  const rateLimitClient = (db as unknown as { rateLimitEntry?: RateLimitClient }).rateLimitEntry;
  if (!rateLimitClient) {
    return getMemoryRateLimitResult(key, options, now);
  }

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
    return getMemoryRateLimitResult(key, options, now);
  }
}

export async function clearRateLimit(key: string) {
  globalRateLimitStore.delete(key);

  if (!db) return;

  const rateLimitClient = (db as unknown as { rateLimitEntry?: { delete: (args: { where: { key: string } }) => Promise<unknown> } }).rateLimitEntry;
  if (!rateLimitClient?.delete) return;

  await rateLimitClient.delete({ where: { key } }).catch(() => undefined);
}

import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => {
  const store = new Map<string, { id: string; count: number; resetAt: Date }>();

  return {
    store,
    rateLimitEntry: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
        const entry = store.get(where.key);
        return entry ? { id: entry.id, count: entry.count, resetAt: entry.resetAt } : null;
      }),
      upsert: vi.fn(async ({ where, update, create }: { where: { key: string }; update: { count: number; resetAt: Date }; create: { key: string; count: number; resetAt: Date } }) => {
        store.set(where.key, { id: where.key, count: update.count, resetAt: update.resetAt });
        return { id: where.key, count: create.count, resetAt: create.resetAt };
      }),
      update: vi.fn(async ({ where, data }: { where: { key: string }; data: { count: number } }) => {
        const existing = store.get(where.key);
        if (!existing) return { id: where.key };
        store.set(where.key, { ...existing, count: data.count });
        return { id: where.key, count: data.count, resetAt: existing.resetAt };
      }),
      delete: vi.fn(async ({ where }: { where: { key: string } }) => {
        store.delete(where.key);
        return { id: where.key };
      }),
    },
  };
});

vi.mock('@/lib/db', () => ({ db: dbMock }));

import { checkRateLimit, clearRateLimit } from './rate-limit';

describe('checkRateLimit', () => {
  beforeEach(async () => {
    dbMock.store.clear();
    vi.clearAllMocks();
    await clearRateLimit('test-key');
    await clearRateLimit('object-key');
    await clearRateLimit('persisted-key');
  });

  it('allows requests within the configured limit', async () => {
    const first = await checkRateLimit('test-key', 2, 60_000);
    const second = await checkRateLimit('test-key', 2, 60_000);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.remaining).toBe(0);
  });

  it('blocks further requests once the limit is exceeded', async () => {
    await checkRateLimit('test-key', 2, 60_000);
    await checkRateLimit('test-key', 2, 60_000);
    const third = await checkRateLimit('test-key', 2, 60_000);

    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
    expect(third.retryAfterMs).toBeGreaterThan(0);
  });

  it('supports the object-based options signature', async () => {
    const first = await checkRateLimit('object-key', { max: 1, windowMs: 60_000 });
    const second = await checkRateLimit('object-key', { max: 1, windowMs: 60_000 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
  });

  it('persists rate-limit state across module reloads', async () => {
    vi.resetModules();

    const { checkRateLimit: reloadedCheckRateLimit } = await import('./rate-limit');
    const first = await reloadedCheckRateLimit('persisted-key', { max: 1, windowMs: 60_000 });

    expect(first.allowed).toBe(true);

    const second = await reloadedCheckRateLimit('persisted-key', { max: 1, windowMs: 60_000 });

    expect(second.allowed).toBe(false);
  });
});

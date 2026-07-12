import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit, clearRateLimit } from './rate-limit';

describe('checkRateLimit', () => {
  beforeEach(async () => {
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

  it('persists rate-limit state across module reloads when a file store is configured', async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'rate-limit-'));
    const storePath = path.join(tempDir, 'store.json');

    process.env.RATE_LIMIT_STORE_FILE = storePath;
    vi.resetModules();

    const { checkRateLimit: reloadedCheckRateLimit } = await import('./rate-limit');
    const first = await reloadedCheckRateLimit('persisted-key', { max: 1, windowMs: 60_000 });

    expect(first.allowed).toBe(true);

    vi.resetModules();
    const { checkRateLimit: reloadedCheckRateLimitAgain } = await import('./rate-limit');
    const second = await reloadedCheckRateLimitAgain('persisted-key', { max: 1, windowMs: 60_000 });

    expect(second.allowed).toBe(false);

    delete process.env.RATE_LIMIT_STORE_FILE;
    await rm(tempDir, { recursive: true, force: true });
  });
});

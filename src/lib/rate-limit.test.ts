import { beforeEach, describe, expect, it } from 'vitest';
import { checkRateLimit, clearRateLimit } from './rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    clearRateLimit('test-key');
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
});

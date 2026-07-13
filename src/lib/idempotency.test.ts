import { beforeEach, describe, expect, it } from 'vitest';
import { createIdempotencyKey, getCachedResult, setCachedResult } from './idempotency';

describe('idempotency helpers', () => {
  beforeEach(() => {
    globalThis.__halandpetIdempotencyStore = new Map();
  });

  it('returns the same payload for the same request key', () => {
    const key = createIdempotencyKey('checkout', { requestId: 'req-1', amount: 100 });
    const payload = { success: true as const, data: { id: 'inv-1' } };

    setCachedResult(key, payload, 60_000);

    expect(getCachedResult(key)).toEqual(payload);
  });

  it('returns undefined after the cache entry expires', () => {
    const key = createIdempotencyKey('payment', { requestId: 'req-2' });
    setCachedResult(key, { success: true as const, data: { id: 'pay-1' } }, 0);

    expect(getCachedResult(key)).toBeUndefined();
  });
});

import { createHash } from 'node:crypto';

export type IdempotencyStoreValue = {
  expiresAt: number;
  value: unknown;
};

const DEFAULT_TTL_MS = 15 * 60 * 1000;

declare global {
  var __halandpetIdempotencyStore: Map<string, IdempotencyStoreValue> | undefined;
}

function getStore() {
  if (!globalThis.__halandpetIdempotencyStore) {
    globalThis.__halandpetIdempotencyStore = new Map<string, IdempotencyStoreValue>();
  }

  return globalThis.__halandpetIdempotencyStore;
}

export function createIdempotencyKey(scope: string, payload: unknown) {
  const normalized = JSON.stringify(payload ?? {});
  return createHash('sha256').update(`${scope}:${normalized}`).digest('hex');
}

export function setCachedResult(key: string, value: unknown, ttlMs = DEFAULT_TTL_MS) {
  const store = getStore();
  const expiresAt = Date.now() + ttlMs;
  store.set(key, { expiresAt, value });
  return key;
}

export function getCachedResult(key: string) {
  const store = getStore();
  const entry = store.get(key);
  if (!entry) return undefined;

  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }

  return entry.value;
}

export function clearExpiredIdempotencyEntries() {
  const store = getStore();
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}

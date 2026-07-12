import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type RateLimitEntry = { count: number; resetAt: number };
type RateLimitStore = Record<string, RateLimitEntry>;

let rateLimitStore: RateLimitStore = {};

function getStorePath() {
  return process.env.RATE_LIMIT_STORE_FILE || path.join(process.cwd(), '.rate-limit-store.json');
}

async function ensureStoreFile() {
  const storePath = getStorePath();
  const directory = path.dirname(storePath);
  await mkdir(directory, { recursive: true });

  try {
    const contents = await readFile(storePath, 'utf8');
    const trimmed = contents.trim();

    if (!trimmed) {
      rateLimitStore = {};
      return;
    }

    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      rateLimitStore = parsed as RateLimitStore;
      return;
    }

    rateLimitStore = {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      rateLimitStore = {};
      return;
    }

    rateLimitStore = {};
  }
}

async function persistStore() {
  const storePath = getStorePath();
  await writeFile(storePath, JSON.stringify(rateLimitStore, null, 2), 'utf8');
}

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
  await ensureStoreFile();

  const now = Date.now();
  const entry = rateLimitStore[key];

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + options.windowMs;
    rateLimitStore[key] = { count: 1, resetAt };
    await persistStore();
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
  await persistStore();
  return { allowed: true, remaining: Math.max(options.max - entry.count, 0), retryAfterMs: 0 };
}

export async function clearRateLimit(key: string) {
  await ensureStoreFile();
  delete rateLimitStore[key];
  await persistStore();
}

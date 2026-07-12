import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const originalNodeEnv = process.env.NODE_ENV;
const originalSeedToken = process.env.SEED_TOKEN;
const originalNextPhase = process.env.NEXT_PHASE;

const setProcessEnv = (key: string, value?: string) => {
  const original = process.env[key];
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
  return original;
};

describe('seed route', () => {
  beforeEach(() => {
    vi.resetModules();
    setProcessEnv('NODE_ENV', 'production');
    setProcessEnv('SEED_TOKEN', 'test-seed-token');
    setProcessEnv('NEXT_PHASE', '');
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      setProcessEnv('NODE_ENV');
    } else {
      setProcessEnv('NODE_ENV', originalNodeEnv);
    }

    if (originalSeedToken === undefined) {
      setProcessEnv('SEED_TOKEN');
    } else {
      setProcessEnv('SEED_TOKEN', originalSeedToken);
    }

    if (originalNextPhase === undefined) {
      setProcessEnv('NEXT_PHASE');
    } else {
      setProcessEnv('NEXT_PHASE', originalNextPhase);
    }
  });

  it('rejects seed requests without the configured token in production', async () => {
    const response = await POST(new Request('http://localhost/api/seed', { method: 'POST', headers: { 'content-type': 'application/json' } }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ message: 'Seed access denied' });
  });

  it('rejects seed requests when no seed token is configured in production', async () => {
    delete process.env.SEED_TOKEN;

    const response = await POST(new Request('http://localhost/api/seed', { method: 'POST', headers: { 'content-type': 'application/json' } }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ message: 'Seed access denied' });
  });
});

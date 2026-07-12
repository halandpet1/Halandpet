import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

const dbMock = vi.hoisted(() => ({
  user: { findFirst: vi.fn(), create: vi.fn(), createMany: vi.fn() },
  clinicSetting: { create: vi.fn() },
  customer: { create: vi.fn() },
}));

const hashPinMock = vi.hoisted(() => vi.fn());
const ensureDevelopmentSeedMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/auth', () => ({ hashPin: hashPinMock }));
vi.mock('@/lib/dev-auth', () => ({ ensureDevelopmentSeed: ensureDevelopmentSeedMock }));

let POST: typeof import('./route').POST;

describe('seed route', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    setProcessEnv('NODE_ENV', 'production');
    setProcessEnv('SEED_TOKEN', 'test-seed-token');
    setProcessEnv('NEXT_PHASE', '');

    hashPinMock.mockResolvedValue('hashed-pin');
    dbMock.user.findFirst.mockResolvedValue(null);
    dbMock.user.create.mockResolvedValue({ id: 'customer-id', username: 'customer', fullName: 'Walk-In Customer', role: 'CUSTOMER' });
    dbMock.customer.create.mockResolvedValue({ id: 'cust-id' });

    ({ POST } = await import('./route'));
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

  it('creates a customer user and linked customer profile when re-running seed', async () => {
    const response = await POST(new Request('http://localhost/api/seed', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-seed-token': 'test-seed-token' },
    }));

    expect(response.status).toBe(200);
    expect(dbMock.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ username: 'customer' }),
    }));
    expect(dbMock.customer.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'customer-id' }),
    }));
  });
});

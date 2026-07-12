import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}));

const verifyPinMock = vi.hoisted(() => vi.fn());
const setSessionCookieMock = vi.hoisted(() => vi.fn());
const checkRateLimitMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/auth', () => ({ hashPin: vi.fn(), verifyPin: verifyPinMock }));
vi.mock('@/lib/session', () => ({ setSessionCookie: setSessionCookieMock }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: checkRateLimitMock }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

import { loginAction } from './auth.actions';

describe('loginAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets a session cookie and redirects after a successful login', async () => {
    dbMock.user.findFirst.mockResolvedValue({
      id: 'user-1',
      pinHash: 'hashed-pin',
      role: 'OWNER',
      fullName: 'Owner HaLand',
    });
    verifyPinMock.mockResolvedValue(true);
    dbMock.user.update.mockResolvedValue({});
    checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 4, retryAfterMs: 0 });

    const result = await loginAction({ username: 'owner', pin: '123456' });

    expect(result).toEqual({
      success: true,
      data: {
        redirectTo: '/dashboard',
        role: 'OWNER',
      },
    });

    expect(setSessionCookieMock).toHaveBeenCalledWith({
      id: 'user-1',
      role: 'OWNER',
      fullName: 'Owner HaLand',
    });
  });

  it('blocks very frequent logins with a friendly error', async () => {
    checkRateLimitMock.mockResolvedValue({ allowed: false, remaining: 0, retryAfterMs: 30_000 });

    const result = await loginAction({ username: 'owner', pin: '123456' });

    expect(result).toEqual({ success: false, error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 30 detik.' });
  });
});

import { describe, expect, it, vi } from 'vitest';

const redirectMock = vi.hoisted(() => vi.fn());
const getSessionUserMock = vi.hoisted(() => vi.fn());

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return {
    ...actual,
    NextResponse: {
      next: vi.fn(() => ({ status: 200 })),
      redirect: vi.fn((url: URL) => ({ status: 307, url })),
    },
  };
});

vi.mock('@/lib/session', () => ({ getSessionUser: getSessionUserMock }));

import { middleware } from './middleware';

describe('middleware', () => {
  it('redirects unauthenticated users to login', async () => {
    getSessionUserMock.mockResolvedValue(null);

    const request = {
      nextUrl: { pathname: '/customers' },
      url: 'http://localhost/customers',
    } as never;

    await middleware(request);

    expect(redirectMock).not.toHaveBeenCalled();
  });
});

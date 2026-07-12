import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirectMock = vi.hoisted(() => vi.fn());
const getSessionUserMock = vi.hoisted(() => vi.fn());
const nextResponseMock = vi.hoisted(() => vi.fn());
const redirectResponseMock = vi.hoisted(() => vi.fn());

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return {
    ...actual,
    NextResponse: {
      next: nextResponseMock,
      redirect: redirectResponseMock,
    },
  };
});

vi.mock('@/lib/session', () => ({ getSessionUser: getSessionUserMock }));

import { middleware } from './middleware';

describe('middleware', () => {
  beforeEach(() => {
    nextResponseMock.mockReset();
    redirectResponseMock.mockReset();
    redirectMock.mockReset();
    getSessionUserMock.mockReset();
  });

  it('redirects unauthenticated users to login', async () => {
    getSessionUserMock.mockResolvedValue(null);
    const response = { status: 307, headers: new Headers(), url: new URL('http://localhost/login') };
    redirectResponseMock.mockReturnValue(response);

    const request = {
      nextUrl: { pathname: '/customers' },
      url: 'http://localhost/customers',
    } as never;

    await middleware(request);

    expect(redirectResponseMock).toHaveBeenCalled();
  });

  it('adds security headers to responses', async () => {
    getSessionUserMock.mockResolvedValue(null);
    const response = { status: 307, headers: new Headers(), url: new URL('http://localhost/login') };
    redirectResponseMock.mockReturnValue(response);

    const request = {
      nextUrl: { pathname: '/customers' },
      url: 'http://localhost/customers',
    } as never;

    await middleware(request);

    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
});

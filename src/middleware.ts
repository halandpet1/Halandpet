import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { canAccessRoute, getRoleRedirectPath } from '@/lib/role-access';

const publicPaths = ['/', '/login', '/api/auth/login', '/api/health', '/api/live', '/api/ready', '/api/seed'];

function applySecurityHeaders(response: Response) {
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
  response.headers.set('content-security-policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';");
  response.headers.set('cross-origin-opener-policy', 'same-origin');
  response.headers.set('cross-origin-resource-policy', 'same-origin');
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return applySecurityHeaders(NextResponse.next());
  }

  const user = await getSessionUser();
  if (!user) {
    return applySecurityHeaders(NextResponse.redirect(new URL('/login', request.url)));
  }

  if (!canAccessRoute(user.role, pathname)) {
    return applySecurityHeaders(NextResponse.redirect(new URL(getRoleRedirectPath(user.role), request.url)));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

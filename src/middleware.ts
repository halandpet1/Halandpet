import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { canAccessRoute, getRoleRedirectPath } from '@/lib/role-access';

const publicPaths = ['/login', '/api/auth/login', '/api/health', '/api/live', '/api/ready', '/api/seed'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!canAccessRoute(user.role, pathname)) {
    return NextResponse.redirect(new URL(getRoleRedirectPath(user.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

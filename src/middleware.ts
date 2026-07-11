import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/session';

const publicPaths = ['/login', '/api/auth/login', '/api/health', '/api/live', '/api/ready'];

const roleAccess: Record<string, Array<'OWNER' | 'ADMIN' | 'DOCTOR' | 'CASHIER' | 'STAFF' | 'CUSTOMER'>> = {
  '/admin': ['OWNER', 'ADMIN'],
  '/inventory': ['OWNER', 'ADMIN', 'DOCTOR', 'STAFF'],
  '/pos': ['OWNER', 'ADMIN', 'CASHIER', 'STAFF'],
  '/hotel': ['OWNER', 'ADMIN', 'STAFF'],
  '/clinical': ['OWNER', 'ADMIN', 'DOCTOR', 'STAFF'],
  '/reports': ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF'],
  '/portal': ['OWNER', 'ADMIN', 'CUSTOMER'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const allowedRoles = Object.entries(roleAccess).find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1];
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return NextResponse.redirect(new URL(user.role === 'CUSTOMER' ? '/portal' : '/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

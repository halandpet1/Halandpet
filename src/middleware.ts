import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/session';

const publicPaths = ['/login', '/api/auth/login', '/api/health', '/api/live', '/api/ready', '/api/seed'];

type RouteRole = 'OWNER' | 'ADMIN' | 'DOCTOR' | 'CASHIER' | 'STAFF' | 'CUSTOMER';
const roleAccess: Array<[string, RouteRole[]]> = [
  ['/dashboard/admin', ['OWNER', 'ADMIN']],
  ['/dashboard/inventory', ['OWNER', 'ADMIN', 'DOCTOR', 'STAFF']],
  ['/dashboard/pos', ['OWNER', 'ADMIN', 'CASHIER', 'STAFF']],
  ['/dashboard/hotel', ['OWNER', 'ADMIN', 'CASHIER', 'STAFF']],
  ['/dashboard/clinical', ['OWNER', 'ADMIN', 'DOCTOR', 'STAFF']],
  ['/dashboard/reports', ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF']],
  ['/dashboard/settings', ['OWNER', 'ADMIN']],
  ['/dashboard/monitoring', ['OWNER', 'ADMIN']],
  ['/dashboard/customers', ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF']],
  ['/dashboard/pets', ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF']],
  ['/dashboard', ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF']],
  ['/portal', ['CUSTOMER']],
];

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

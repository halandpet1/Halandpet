'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { UserRole } from '@prisma/client';
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Bell,
  Boxes,
  ChevronRight,
  ClipboardList,
  Home,
  Hotel,
  Menu,
  ReceiptText,
  ShoppingCart,
  ShieldCheck,
  Stethoscope,
  UserCircle2,
  Users,
  Settings,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildBreadcrumbItems } from '@/lib/dashboard-navigation';
import { getDashboardRoleConfig } from '@/lib/role-access';
import { cn } from '@/lib/utils';

const iconMap: Record<string, typeof Home> = {
  '/dashboard': Home,
  '/portal': UserCircle2,
  '/customers': Users,
  '/clinical': Stethoscope,
  '/inventory': Boxes,
  '/pos': ShoppingCart,
  '/hotel': Hotel,
  '/reports': BarChart3,
  '/settings': Settings,
  '/monitoring': Activity,
  '/admin': ShieldCheck,
  '/pets': Users,
  '/medical-record': Stethoscope,
  '/prescription': ClipboardList,
  '/laboratory': Activity,
  '/vaccination': BadgeCheck,
  '/daily-task': ClipboardList,
  '/appointment': Bell,
  '/medical-history': Stethoscope,
  '/invoice': ReceiptText,
  '/profile': UserCircle2,
  '/pos/invoice': ReceiptText,
  '/pos/payment': ShoppingCart,
};

const baseNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF', 'CUSTOMER'] as UserRole[] },
  { href: '/portal', label: 'Portal Pelanggan', icon: UserCircle2, roles: ['CUSTOMER'] as UserRole[] },
  { href: '/customers', label: 'Pelanggan', icon: Users, roles: ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF'] as UserRole[] },
  { href: '/clinical', label: 'Klinis', icon: Stethoscope, roles: ['OWNER', 'ADMIN', 'DOCTOR', 'STAFF'] as UserRole[] },
  { href: '/inventory', label: 'Inventaris', icon: Boxes, roles: ['OWNER', 'ADMIN', 'DOCTOR', 'STAFF'] as UserRole[] },
  { href: '/pos', label: 'POS', icon: ShoppingCart, roles: ['OWNER', 'ADMIN', 'CASHIER', 'STAFF'] as UserRole[] },
  { href: '/hotel', label: 'Pet Hotel', icon: Hotel, roles: ['OWNER', 'ADMIN', 'CASHIER', 'STAFF'] as UserRole[] },
  { href: '/reports', label: 'Laporan', icon: BarChart3, roles: ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF'] as UserRole[] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['OWNER', 'ADMIN'] as UserRole[] },
  { href: '/monitoring', label: 'Monitoring', icon: Activity, roles: ['OWNER', 'ADMIN'] as UserRole[] },
  { href: '/admin', label: 'Administrasi', icon: ShieldCheck, roles: ['OWNER', 'ADMIN'] as UserRole[] },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role] = useState<UserRole>(() => {
    if (typeof window === 'undefined') {
      return 'OWNER';
    }

    return (window.sessionStorage.getItem('haland-role') as UserRole | null) ?? 'OWNER';
  });

  const roleConfig = getDashboardRoleConfig(role);
  const navItems = baseNavItems.filter((item) => item.roles.includes(role));
  const extraNavItems = roleConfig.navigation
    .filter((item) => !navItems.some((existing) => existing.href === item.href))
    .map((item) => ({ ...item, icon: iconMap[item.href] ?? Home }));
  const navigationItems = [...navItems, ...extraNavItems];

  const breadcrumbItems = buildBreadcrumbItems(pathname);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_28%),linear-gradient(135deg,_#020617_0%,_#0f172a_100%)] text-slate-100">
      <aside
        id="dashboard-sidebar"
        aria-label="Primary"
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 border-r border-white/10 bg-slate-950/95 p-6 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-sky-300">HaLand PetCare</p>
            <h1 className="mt-2 text-xl font-semibold text-white">Integrated Clinic</h1>
          </div>
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav aria-label="Primary navigation" className="space-y-1.5">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-between rounded-xl px-3 py-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                  isActive
                    ? 'bg-sky-500/15 text-sky-300 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.25)]'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white',
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu">
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{role === 'CUSTOMER' ? 'Portal' : 'Operasional'}</p>
                <h2 className="text-lg font-semibold text-white">Panel utama</h2>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                <Bell className="mr-2 h-4 w-4" />
                Notifikasi
              </Button>
              <div className="flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/15 text-sm font-semibold text-sky-300">
                  A
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-white">{role}</p>
                  <p className="text-xs text-slate-400">{role === 'CUSTOMER' ? 'Customer Portal' : 'Operations'}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
              {breadcrumbItems.map((item, index) => (
                <div key={item.href} className="flex items-center gap-2">
                  {index > 0 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
                  {index === breadcrumbItems.length - 1 ? (
                    <span className="text-white">{item.label}</span>
                  ) : (
                    <Link href={item.href} className="transition hover:text-white">
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
            <div className="space-y-8">{children}</div>
          </div>
        </main>
      </div>

      {mobileOpen ? <button type="button" className="fixed inset-0 z-20 bg-slate-950/70 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" /> : null}
    </div>
  );
}

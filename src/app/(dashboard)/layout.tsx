import Link from 'next/link';
import { Home, Users, Stethoscope, Boxes, ShoppingCart, Hotel, BarChart3, ShieldCheck, UserCircle2 } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/portal', label: 'Portal Pelanggan', icon: UserCircle2 },
  { href: '/customers', label: 'Pelanggan', icon: Users },
  { href: '/clinical', label: 'Klinis', icon: Stethoscope },
  { href: '/inventory', label: 'Inventaris', icon: Boxes },
  { href: '/pos', label: 'POS', icon: ShoppingCart },
  { href: '/hotel', label: 'Pet Hotel', icon: Hotel },
  { href: '/reports', label: 'Laporan', icon: BarChart3 },
  { href: '/admin', label: 'Administrasi', icon: ShieldCheck },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed inset-y-0 left-0 w-72 border-r border-white/10 bg-slate-900/90 p-6">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">HaLand PetCare</p>
          <h1 className="mt-2 text-xl font-semibold">Integrated Clinic</h1>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition hover:bg-slate-800"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="ml-72 min-h-screen bg-slate-950 p-8">
        <div className="mx-auto max-w-7xl space-y-8">{children}</div>
      </main>
    </div>
  );
}

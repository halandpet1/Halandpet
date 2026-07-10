import Link from 'next/link';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';

export default async function DashboardPage() {
  if (!db || process.env.NEXT_PHASE === 'phase-production-build') {
    return <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">Database belum dikonfigurasi.</div>;
  }

  const [customers, invoices, products, bookings, appointments] = await Promise.all([
    db.customer.count({ where: { deletedAt: null } }),
    db.invoice.count({ where: { deletedAt: null } }),
    db.product.count({ where: { deletedAt: null } }),
    db.hotelBooking.count({ where: { deletedAt: null, status: { in: ['RESERVED', 'CHECKED_IN', 'WAITING_LIST'] } } }),
    db.appointment.count({ where: { deletedAt: null, status: { in: ['SCHEDULED', 'CHECKED_IN', 'WAITING', 'CONSULTING'] } } }),
  ]);

  const revenue = await db.invoice.aggregate({
    where: { deletedAt: null, status: { in: ['PAID', 'PARTIAL'] } },
    _sum: { total: true },
  });

  const revenueValue = Number(revenue._sum.total ?? 0);

  const cards = [
    { label: 'Pelanggan', value: customers.toString() },
    { label: 'Transaksi', value: invoices.toString() },
    { label: 'Produk', value: products.toString() },
    { label: 'Pendapatan', value: formatCurrency(revenueValue) },
  ];

  const shortcuts = [
    { href: '/portal', label: 'Portal pelanggan' },
    { href: '/reports', label: 'Laporan enterprise' },
    { href: '/hotel', label: 'Kelola pet hotel' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Dashboard</p>
        <h1 className="text-3xl font-semibold">Ringkasan operasional</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-sm">
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-3 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Aktivitas operasional</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Booking hotel aktif</p>
              <p className="mt-2 text-2xl font-semibold">{bookings}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Janji temu menunggu</p>
              <p className="mt-2 text-2xl font-semibold">{appointments}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Akses cepat</h2>
          <div className="mt-4 space-y-2">
            {shortcuts.map((shortcut) => (
              <Link key={shortcut.href} href={shortcut.href} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-sm transition hover:bg-slate-800">
                <span>{shortcut.label}</span>
                <span className="text-slate-400">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

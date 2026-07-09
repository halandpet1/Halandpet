import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';

export default async function DashboardPage() {
  if (!db || process.env.NEXT_PHASE === 'phase-production-build') {
    return <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">Database belum dikonfigurasi.</div>;
  }

  const [customers, invoices, products] = await Promise.all([
    db.customer.count({ where: { deletedAt: null } }),
    db.invoice.count({ where: { deletedAt: null } }),
    db.product.count({ where: { deletedAt: null } }),
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

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Status foundation</h2>
        <p className="mt-2 text-sm text-slate-400">
          Sistem foundation mencakup autentikasi, database, role, dan dashboard awal sesuai PRD.
        </p>
      </div>
    </div>
  );
}

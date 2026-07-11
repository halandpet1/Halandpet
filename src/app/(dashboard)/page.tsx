import Link from 'next/link';
import { Activity, ArrowUpRight, BarChart3, Clock3, Hotel, Stethoscope, Users2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';

export default async function DashboardPage() {
  if (!db || process.env.NEXT_PHASE === 'phase-production-build') {
    const fallbackCards = [
      { label: 'Pelanggan', value: '0', icon: Users2, accent: 'text-sky-300' },
      { label: 'Transaksi', value: '0', icon: BarChart3, accent: 'text-emerald-300' },
      { label: 'Produk', value: '0', icon: Activity, accent: 'text-violet-300' },
      { label: 'Pendapatan', value: 'Rp 0', icon: ArrowUpRight, accent: 'text-amber-300' },
    ];

    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-800/90 bg-slate-900/70 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
          <div className="flex items-center gap-2">
            <Badge className="border-sky-400/20 bg-sky-500/10 text-sky-300">Live Overview</Badge>
            <Badge variant="outline" className="border-slate-700 text-slate-300">
              Mode lokal
            </Badge>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Dashboard</p>
              <h1 className="text-3xl font-semibold text-white">Ringkasan operasional</h1>
            </div>
            <p className="max-w-2xl text-sm text-slate-400">Database belum dikonfigurasi, sehingga dashboard menampilkan status lokal yang aman untuk pengujian dan demo.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {fallbackCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="border-slate-800/80 bg-slate-900/70">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-400">{card.label}</p>
                      <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
                    </div>
                    <div className={`rounded-xl bg-slate-950/70 p-2 ${card.accent}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
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
    { label: 'Pelanggan', value: customers.toString(), icon: Users2, accent: 'text-sky-300' },
    { label: 'Transaksi', value: invoices.toString(), icon: BarChart3, accent: 'text-emerald-300' },
    { label: 'Produk', value: products.toString(), icon: Activity, accent: 'text-violet-300' },
    { label: 'Pendapatan', value: formatCurrency(revenueValue), icon: ArrowUpRight, accent: 'text-amber-300' },
  ];

  const shortcuts = [
    { href: '/portal', label: 'Portal pelanggan', description: 'Layanan mandiri untuk pelanggan' },
    { href: '/reports', label: 'Laporan enterprise', description: 'Insight operasional dan keuangan' },
    { href: '/hotel', label: 'Kelola pet hotel', description: 'Pantau booking dan stay aktif' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-800/90 bg-slate-900/70 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
        <div className="flex items-center gap-2">
          <Badge className="border-sky-400/20 bg-sky-500/10 text-sky-300">Live Overview</Badge>
          <Badge variant="outline" className="border-slate-700 text-slate-300">
            Hari ini
          </Badge>
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Dashboard</p>
            <h1 className="text-3xl font-semibold text-white">Ringkasan operasional</h1>
          </div>
          <p className="max-w-2xl text-sm text-slate-400">Pantau klinik, hotel, dan penjualan dari satu layar dengan metrik yang selalu terupdate.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-slate-800/80 bg-slate-900/70">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">{card.label}</p>
                    <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
                  </div>
                  <div className={`rounded-xl bg-slate-950/70 p-2 ${card.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardHeader>
            <CardTitle>Aktivitas operasional</CardTitle>
            <CardDescription>Ringkasan beban kerja hospitalitas dan klinis hari ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="flex items-center gap-2 text-sky-300">
                  <Hotel className="h-4 w-4" />
                  <p className="text-sm font-medium">Booking hotel aktif</p>
                </div>
                <p className="mt-3 text-3xl font-semibold text-white">{bookings}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Stethoscope className="h-4 w-4" />
                  <p className="text-sm font-medium">Janji temu menunggu</p>
                </div>
                <p className="mt-3 text-3xl font-semibold text-white">{appointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardHeader>
            <CardTitle>Akses cepat</CardTitle>
            <CardDescription>Langkah berikutnya yang paling sering dipakai tim.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {shortcuts.map((shortcut) => (
              <Link key={shortcut.href} href={shortcut.href} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 transition hover:border-sky-400/40 hover:bg-slate-900">
                <div>
                  <p className="font-medium text-white">{shortcut.label}</p>
                  <p className="mt-1 text-sm text-slate-400">{shortcut.description}</p>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock3 className="h-4 w-4" />
                  <span className="text-sm">Buka</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

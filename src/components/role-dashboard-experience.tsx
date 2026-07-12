import Link from 'next/link';
import type { UserRole } from '@prisma/client';
import { AlertTriangle, ArrowUpRight, BadgeCheck, BellRing, ClipboardList, Clock3, Hotel, Package2, ReceiptText, Stethoscope, Users2, ShoppingCart, LayoutGrid } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardRoleConfig } from '@/lib/role-access';
import { formatCurrency } from '@/lib/utils';

type DashboardMetrics = {
  customers: number;
  invoices: number;
  products: number;
  bookings: number;
  appointments: number;
  revenueToday: number;
  revenueMonth: number;
  pendingInvoices: number;
  lowStockCount: number;
  queues: number;
  activeTreatments: number;
  todaySchedule: number;
  openInvoices: number;
  pendingPayments: number;
  hotelTasks: number;
};

export function RoleDashboardExperience({ role, metrics }: { role: UserRole; metrics: DashboardMetrics }) {
  const roleConfig = getDashboardRoleConfig(role);

  const ownerKpis = [
    { label: 'Revenue Today', value: formatCurrency(metrics.revenueToday), icon: ArrowUpRight, accent: 'text-emerald-300' },
    { label: 'Revenue This Month', value: formatCurrency(metrics.revenueMonth), icon: BadgeCheck, accent: 'text-sky-300' },
    { label: 'Pending Payments', value: metrics.pendingInvoices.toString(), icon: ReceiptText, accent: 'text-amber-300' },
    { label: 'Low Stock Alerts', value: metrics.lowStockCount.toString(), icon: AlertTriangle, accent: 'text-rose-300' },
  ];

  const adminKpis = [
    { label: 'Today Appointment', value: metrics.appointments.toString(), icon: ClipboardList, accent: 'text-sky-300' },
    { label: 'Pending Check-in', value: metrics.bookings.toString(), icon: Hotel, accent: 'text-emerald-300' },
    { label: 'Low Stock', value: metrics.lowStockCount.toString(), icon: Package2, accent: 'text-amber-300' },
    { label: 'Open Invoice', value: metrics.openInvoices.toString(), icon: ReceiptText, accent: 'text-violet-300' },
  ];

  const doctorKpis = [
    { label: 'Today Schedule', value: metrics.todaySchedule.toString(), icon: Clock3, accent: 'text-sky-300' },
    { label: 'Queue', value: metrics.queues.toString(), icon: Users2, accent: 'text-emerald-300' },
    { label: 'Active Treatment', value: metrics.activeTreatments.toString(), icon: Stethoscope, accent: 'text-violet-300' },
    { label: 'Pending Payment', value: metrics.pendingPayments.toString(), icon: ReceiptText, accent: 'text-amber-300' },
  ];

  const cashierKpis = [
    { label: 'Today Sales', value: formatCurrency(metrics.revenueToday), icon: ShoppingCart, accent: 'text-emerald-300' },
    { label: 'Open Invoice', value: metrics.openInvoices.toString(), icon: ReceiptText, accent: 'text-sky-300' },
    { label: 'Pending Payment', value: metrics.pendingPayments.toString(), icon: Clock3, accent: 'text-amber-300' },
    { label: 'Daily Cash', value: formatCurrency(metrics.revenueMonth), icon: BadgeCheck, accent: 'text-violet-300' },
  ];

  const staffKpis = [
    { label: 'Daily Tasks', value: metrics.hotelTasks.toString(), icon: ClipboardList, accent: 'text-sky-300' },
    { label: 'Inventory Tasks', value: metrics.lowStockCount.toString(), icon: Package2, accent: 'text-amber-300' },
    { label: 'Hotel Tasks', value: metrics.bookings.toString(), icon: Hotel, accent: 'text-emerald-300' },
    { label: 'Pending Appointment', value: metrics.appointments.toString(), icon: BellRing, accent: 'text-violet-300' },
  ];

  const kpis = role === 'OWNER'
    ? ownerKpis
    : role === 'ADMIN'
      ? adminKpis
      : role === 'DOCTOR'
        ? doctorKpis
        : role === 'CASHIER'
          ? cashierKpis
          : role === 'STAFF'
            ? staffKpis
            : [
              { label: 'Upcoming Appointment', value: metrics.appointments.toString(), icon: BellRing, accent: 'text-sky-300' },
              { label: 'Pets', value: metrics.customers.toString(), icon: Users2, accent: 'text-emerald-300' },
              { label: 'Invoice', value: metrics.invoices.toString(), icon: ReceiptText, accent: 'text-violet-300' },
              { label: 'Hotel Booking', value: metrics.bookings.toString(), icon: Hotel, accent: 'text-amber-300' },
            ];

  const quickActions = role === 'OWNER'
    ? [
      { href: '/reports', label: 'Review laporan', description: 'Periksa performa keuangan dan operasi' },
      { href: '/admin', label: 'Audit log', description: 'Pantau aktivitas penting tim' },
      { href: '/customers', label: 'Kelola pelanggan', description: 'Lihat customer dan pet terbaru' },
    ]
    : role === 'ADMIN'
      ? [
        { href: '/inventory', label: 'Restock stok', description: 'Tindaklanjuti item yang perlu dipenuhi' },
        { href: '/customers', label: 'Pantau pelanggan', description: 'Cek janji temu dan riwayat' },
        { href: '/hotel', label: 'Review hotel', description: 'Periksa booking dan room status' },
      ]
      : role === 'DOCTOR'
        ? [
          { href: '/clinical', label: 'Buka antrian', description: 'Prioritaskan pasien yang menunggu' },
          { href: '/medical-record', label: 'Catat rekam medis', description: 'Lanjutkan pemeriksaan aktif' },
          { href: '/vaccination', label: 'Reminder vaksin', description: 'Pantau jadwal dan kunjungan' },
        ]
        : role === 'CASHIER'
          ? [
            { href: '/pos', label: 'Checkout cepat', description: 'Proses transaksi pelanggan dengan cepat' },
            { href: '/pos/invoice', label: 'Invoice', description: 'Monitor invoice terbuka dan tertunda' },
            { href: '/pos/payment', label: 'Pembayaran', description: 'Lacak pembayaran yang menunggu' },
          ]
          : role === 'STAFF'
            ? [
              { href: '/inventory', label: 'Tugas stok', description: 'Periksa low stock dan kebutuhan restock' },
              { href: '/hotel', label: 'Tugas hotel', description: 'Cek check-in, cleaning, dan feeding' },
              { href: '/daily-task', label: 'Daily task', description: 'Prioritaskan pekerjaan harian' },
            ]
            : [
              { href: '/portal', label: 'Portal saya', description: 'Buka ringkasan akun pribadi' },
              { href: '/appointment', label: 'Janji temu', description: 'Lihat agenda dan update terbaru' },
              { href: '/invoice', label: 'Invoice', description: 'Pantau status transaksi Anda' },
            ];

  const activityItems = role === 'OWNER'
    ? [
      'Revenue hari ini melampaui target awal dan memerlukan tindak lanjut penjualan.',
      'Ada beberapa low stock item yang sebaiknya diproses sebelum sore.',
      'Tim klinis dan hotel mencatat aktivitas yang perlu disinkronkan.',
    ]
    : role === 'ADMIN'
      ? [
        'Antrian kunjungan meningkat di awal hari.',
        'Beberapa item stok sudah mendekati batas minimum.',
        'Booking hotel membutuhkan review room readiness sebelum check-in.',
      ]
      : role === 'DOCTOR'
        ? [
          'Pasien dengan status waiting consultation butuh penanganan segera.',
          'Catatan medis yang belum selesai harus ditutup sebelum shift selesai.',
          'Reminder vaksin hari ini telah siap diproses.',
        ]
        : role === 'CASHIER'
          ? [
            'Transaksi tertunda masih menunggu pembayaran.',
            'Invoice dengan status open perlu ditutup sebelum jam operasional akhir.',
            'Ada item populer yang sering dibeli hari ini.',
          ]
          : role === 'STAFF'
            ? [
              'Schedule cleaning dan feeding perlu disinkronkan ulang.',
              'Beberapa item inventaris membutuhkan pengecekan fisik.',
              'Booking hotel hari ini sudah siap untuk check-in.',
            ]
            : [
              'Reminder vaksin dan janji temu Anda siap ditampilkan.',
              'Riwayat perawatan dan hotel booking Anda terupdate.',
              'Invoice dan pembayaran dapat dipantau dari portal.',
            ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-800/90 bg-slate-900/70 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-sky-400/20 bg-sky-500/10 text-sky-300">{roleConfig.badge}</Badge>
          <Badge variant="outline" className="border-slate-700 text-slate-300">Live experience</Badge>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Dashboard</p>
            <h1 className="text-3xl font-semibold text-white">{roleConfig.title}</h1>
          </div>
          <p className="max-w-2xl text-sm text-slate-400">{roleConfig.subtitle}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border-slate-800/80 bg-slate-900/70">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">{item.label}</p>
                    <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
                  </div>
                  <div className={`rounded-xl bg-slate-950/70 p-2 ${item.accent}`}>
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
            <CardTitle>Business health</CardTitle>
            <CardDescription>Ringkasan performa utama yang paling relevan untuk peran saat ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <div className="flex items-center gap-2 text-sky-300">
                <LayoutGrid className="h-4 w-4" />
                <p className="text-sm font-medium">Operational pulse</p>
              </div>
              <p className="mt-3 text-sm text-slate-400">Dashboard ini menggabungkan KPI, aktivitas terbaru, dan shortcut yang paling sering dipakai untuk menjaga alur kerja tetap lancar.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Customer fokus</p>
                <p className="mt-2 text-xl font-semibold text-white">{metrics.customers}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Aktivitas hari ini</p>
                <p className="mt-2 text-xl font-semibold text-white">{metrics.appointments + metrics.bookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Shortcut yang disesuaikan dengan kebutuhan role dan prioritas harian.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href} className="flex items-start justify-between rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 transition hover:border-sky-400/40 hover:bg-slate-900">
                <div>
                  <p className="font-medium text-white">{action.label}</p>
                  <p className="mt-1 text-sm text-slate-400">{action.description}</p>
                </div>
                <ArrowUpRight className="mt-1 h-4 w-4 text-slate-400" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Aktivitas terbaru yang paling relevan untuk role Anda saat ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityItems.map((item, index) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 text-sky-300">
                  {index + 1}
                </div>
                <p className="text-sm text-slate-300">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardHeader>
            <CardTitle>Priority timeline</CardTitle>
            <CardDescription>Prioritas yang paling penting untuk diselesaikan hari ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              'Review KPI dan status operasional awal hari.',
              'Tindaklanjuti low stock dan booking yang menunggu.',
              'Pastikan notifikasi pelanggan dan invoice terupdate.',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

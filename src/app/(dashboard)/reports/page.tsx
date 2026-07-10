import { getEnterpriseReportingSummary } from '@/actions/reporting.actions';
import { getHotelReportingData } from '@/actions/hotel.actions';
import { getInventoryReportData } from '@/actions/inventory.actions';
import { getSalesReportSummary } from '@/actions/sales.actions';
import { formatCurrency } from '@/lib/utils';

export default async function ReportsPage() {
  const [hotelReport, inventoryReport, salesSummary, enterpriseSummary] = await Promise.all([
    getHotelReportingData(),
    getInventoryReportData(),
    getSalesReportSummary(),
    getEnterpriseReportingSummary({ period: 'monthly' }),
  ]);

  const hotelBookings = hotelReport.success ? hotelReport.data?.bookings ?? [] : [];
  const inventoryProducts = inventoryReport.success ? inventoryReport.data?.products ?? [] : [];
  const sales = salesSummary.success ? salesSummary.data : null;
  const enterprise = enterpriseSummary.success ? enterpriseSummary.data : null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Reporting</p>
        <h1 className="text-3xl font-semibold">Laporan enterprise</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Revenue</p>
          <p className="mt-3 text-2xl font-semibold">{enterprise ? formatCurrency(enterprise.summary.revenue) : '—'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Outstanding</p>
          <p className="mt-3 text-2xl font-semibold">{enterprise ? formatCurrency(enterprise.summary.outstanding) : '—'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Janji temu</p>
          <p className="mt-3 text-2xl font-semibold">{enterprise?.summary.appointments ?? '—'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Booking hotel</p>
          <p className="mt-3 text-2xl font-semibold">{enterprise?.summary.bookings ?? '—'}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Ringkasan bisnis</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-white/10 bg-slate-950 px-3 py-3">
              <p className="text-sm text-slate-400">Revenue hari ini</p>
              <p className="mt-2 text-lg font-semibold">{sales ? formatCurrency(sales.today.revenue) : '—'}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950 px-3 py-3">
              <p className="text-sm text-slate-400">Pelanggan terdaftar</p>
              <p className="mt-2 text-lg font-semibold">{enterprise?.summary.customers ?? '—'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Inventory alert</h2>
          <ul className="mt-4 space-y-3">
            {enterprise?.inventoryAlerts.slice(0, 5).map((item) => (
              <li key={item.id} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-3">
                <p className="font-medium">{item.name}</p>
                <p className="mt-1 text-sm text-slate-400">Qty {item.currentQty} • Min {item.minStock}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Hotel</h2>
          <ul className="mt-4 space-y-3">
            {hotelBookings.slice(0, 5).map((booking) => (
              <li key={booking.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950 px-3 py-3">
                <div>
                  <p className="font-medium">{booking.bookingNo}</p>
                  <p className="text-sm text-slate-400">{booking.customer?.name ?? 'Walk-In'}</p>
                </div>
                <span className="text-sm text-slate-300">{booking.status}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Inventaris</h2>
          <ul className="mt-4 space-y-3">
            {inventoryProducts.slice(0, 5).map((product) => (
              <li key={product.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950 px-3 py-3">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-slate-400">SKU {product.sku}</p>
                </div>
                <span className="text-sm text-slate-300">Qty {product.currentQty}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

import { getHotelReportingData } from '@/actions/hotel.actions';
import { getInventoryReportData } from '@/actions/inventory.actions';
import { getSalesReportSummary } from '@/actions/sales.actions';
import { formatCurrency } from '@/lib/utils';

export default async function ReportsPage() {
  const [hotelReport, inventoryReport, salesSummary] = await Promise.all([
    getHotelReportingData(),
    getInventoryReportData(),
    getSalesReportSummary(),
  ]);

  const hotelBookings = hotelReport.success ? hotelReport.data?.bookings ?? [] : [];
  const inventoryProducts = inventoryReport.success ? inventoryReport.data?.products ?? [] : [];
  const sales = salesSummary.success ? salesSummary.data : null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Reporting</p>
        <h1 className="text-3xl font-semibold">Laporan enterprise</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Revenue hari ini</p>
          <p className="mt-3 text-2xl font-semibold">{sales ? formatCurrency(sales.today.revenue) : '—'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Booking hotel aktif</p>
          <p className="mt-3 text-2xl font-semibold">{hotelBookings.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Produk inventory</p>
          <p className="mt-3 text-2xl font-semibold">{inventoryProducts.length}</p>
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

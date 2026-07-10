import { getSystemMonitoringSummary } from '@/actions/enterprise.actions';
import { formatCurrency } from '@/lib/utils';

export default async function MonitoringPage() {
  const result = await getSystemMonitoringSummary();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Monitoring</p>
        <h1 className="text-3xl font-semibold">System monitoring</h1>
      </div>

      {result.success ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Revenue Hari Ini', value: formatCurrency(result.data.widgets.revenueToday) },
            { label: 'Revenue Bulan Ini', value: formatCurrency(result.data.widgets.revenueMonth) },
            { label: 'Antrian Janji Temu', value: result.data.widgets.appointmentQueue.toString() },
            { label: 'Occupancy Hotel', value: result.data.widgets.hotelOccupancy.toString() },
            { label: 'Inventory Alert', value: result.data.widgets.inventoryAlert.toString() },
            { label: 'Customer Growth', value: result.data.widgets.customerGrowth.toString() },
            { label: 'Audit Log 7 Hari', value: result.data.widgets.auditLogCount.toString() },
            { label: 'Database Health', value: result.data.widgets.databaseHealth },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className="mt-3 text-2xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">{result.error}</div>
      )}
    </div>
  );
}

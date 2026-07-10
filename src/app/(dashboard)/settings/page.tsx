import { getSystemSettings } from '@/actions/enterprise.actions';
import { formatCurrency } from '@/lib/utils';

export default async function SettingsPage() {
  const result = await getSystemSettings();
  const settings = result.success
    ? (result.data.settings as { clinicName?: string; currency?: string; taxRate?: number; timezone?: string })
    : undefined;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Settings</p>
        <h1 className="text-3xl font-semibold">Konfigurasi sistem</h1>
      </div>

      {result.success ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">General</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950 px-3 py-3">
                <span>Nama Klinik</span>
                <span>{settings?.clinicName ?? 'HaLand PetCare'}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950 px-3 py-3">
                <span>Currency</span>
                <span>{settings?.currency ?? 'IDR'}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950 px-3 py-3">
                <span>Tax</span>
                <span>{settings?.taxRate ?? 0}%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950 px-3 py-3">
                <span>Timezone</span>
                <span>{settings?.timezone ?? 'Asia/Jakarta'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Business Summary</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950 px-3 py-3">
                <span>Revenue</span>
                <span>{formatCurrency(result.data.summary.revenue)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950 px-3 py-3">
                <span>Customers</span>
                <span>{result.data.summary.customers}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950 px-3 py-3">
                <span>Products</span>
                <span>{result.data.summary.products}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950 px-3 py-3">
                <span>Bookings</span>
                <span>{result.data.summary.bookings}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">{result.error}</div>
      )}
    </div>
  );
}

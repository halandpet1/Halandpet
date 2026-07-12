import { ModulePageShell } from '@/components/module-page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PosInvoicePage() {
  return (
    <ModulePageShell title="POS Invoice" description="Pantau invoice penjualan, status pembayaran, dan kuitansi yang sedang berjalan." badge="POS Module">
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardHeader>
            <CardTitle>Open invoices</CardTitle>
            <CardDescription>Daftar invoice yang belum selesai.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {['INV-1201 - Rp 320.000', 'INV-1203 - Rp 180.000'].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-300">{item}</div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardHeader>
            <CardTitle>Completed today</CardTitle>
            <CardDescription>Invoice yang telah selesai diproses hari ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {['INV-1198 - lunas', 'INV-1199 - lunas'].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-300">{item}</div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ModulePageShell>
  );
}

import { ModulePageShell } from '@/components/module-page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PosPaymentPage() {
  return (
    <ModulePageShell title="POS Payment" description="Pantau status pembayaran, metode, dan transaksi yang menunggu konfirmasi." badge="POS Module">
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardHeader>
            <CardTitle>Pending payment</CardTitle>
            <CardDescription>Pembayaran yang belum selesai.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {['Transfer - INV-1201', 'Cash - INV-1203'].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-300">{item}</div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardHeader>
            <CardTitle>Payment methods</CardTitle>
            <CardDescription>Distribusi metode pembayaran yang umum dipakai.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {['Cash 45%', 'Transfer 35%', 'QRIS 20%'].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-300">{item}</div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ModulePageShell>
  );
}

import { ModulePageShell } from '@/components/module-page-shell';
import { ModuleInfoListCard, ModuleMetricCards } from '@/components/module-page-blocks';
import { Clock3, ReceiptText, Sparkles } from 'lucide-react';

export default function InvoicePage() {
  return (
    <ModulePageShell title="Invoice" description="Pantau tagihan, pembayaran, dan riwayat transaksi pelanggan." badge="Customer Portal">
      <ModuleMetricCards items={[
        { label: 'Outstanding', value: '2', icon: ReceiptText, tone: 'amber' },
        { label: 'Paid', value: '3', icon: Sparkles, tone: 'emerald' },
        { label: 'Due soon', value: '1', icon: Clock3, tone: 'sky' },
      ]} />

      <div className="grid gap-6 xl:grid-cols-2">
        <ModuleInfoListCard title="Outstanding" description="Invoice yang masih menunggu pembayaran." items={['INV-1024 - Rp 450.000', 'INV-1027 - Rp 900.000']} icon={ReceiptText} />
        <ModuleInfoListCard title="Paid history" description="Riwayat invoice yang sudah terbayar." items={['INV-1018 - lunas', 'INV-1020 - lunas', 'INV-1022 - lunas']} icon={Sparkles} />
      </div>
    </ModulePageShell>
  );
}

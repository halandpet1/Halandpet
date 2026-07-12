import { ModulePageShell } from '@/components/module-page-shell';
import { ModuleInfoListCard, ModuleMetricCards } from '@/components/module-page-blocks';
import { FileText, HeartPulse, Stethoscope } from 'lucide-react';

export default function MedicalHistoryPage() {
  return (
    <ModulePageShell title="Medical History" description="Lihat riwayat pemeriksaan, perawatan, dan hasil klinis hewan peliharaan." badge="Customer Portal">
      <ModuleMetricCards items={[
        { label: 'Recent visits', value: '3', icon: FileText, tone: 'sky' },
        { label: 'Treatments', value: '5', icon: HeartPulse, tone: 'rose' },
        { label: 'Notes shared', value: '2', icon: Stethoscope, tone: 'violet' },
      ]} />

      <div className="grid gap-6 xl:grid-cols-2">
        <ModuleInfoListCard title="Recent visits" description="Riwayat kunjungan terbaru pelanggan." items={['Pemeriksaan rutin - 2 minggu lalu', 'Vaksin booster - 1 bulan lalu', 'Perawatan luka - 2 bulan lalu']} icon={FileText} />
        <ModuleInfoListCard title="Doctor notes" description="Catatan medis yang bisa diakses pelanggan." items={['Kondisi sehat secara umum', 'Perlu vitamin tambahan', 'Jaga pola makan dan hidrasi']} icon={Stethoscope} />
      </div>
    </ModulePageShell>
  );
}

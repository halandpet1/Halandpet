import { ModulePageShell } from '@/components/module-page-shell';
import { ModuleInfoListCard, ModuleMetricCards } from '@/components/module-page-blocks';
import { Activity, FlaskConical, Microscope, TestTube2 } from 'lucide-react';

export default function LaboratoryPage() {
  return (
    <ModulePageShell title="Laboratory" description="Pantau hasil pemeriksaan, sampel, dan status laboratorium dari satu halaman." badge="Clinical Module">
      <ModuleMetricCards items={[
        { label: 'Pending sample', value: '4', icon: FlaskConical, tone: 'amber' },
        { label: 'Result ready', value: '7', icon: TestTube2, tone: 'sky' },
        { label: 'Follow-up needed', value: '2', icon: Microscope, tone: 'violet' },
      ]} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ModuleInfoListCard title="Pending sample" description="Hasil laboratorium yang masih menunggu review." items={['CBC - 2 sampel', 'Urinalysis - 1 sampel', 'Fecal test - 1 sampel']} icon={Activity} />
        <ModuleInfoListCard title="Result summary" description="Ringkasan hasil dan kesimpulan klinis." items={['Normal hematologi', 'Terdapat potensi infeksi ringan', 'Diperlukan repeat check minggu depan']} icon={TestTube2} />
      </div>
    </ModulePageShell>
  );
}

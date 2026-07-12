import { ModulePageShell } from '@/components/module-page-shell';
import { ModuleInfoListCard, ModuleMetricCards } from '@/components/module-page-blocks';
import { ClipboardList, Pill, Stethoscope } from 'lucide-react';

export default function PrescriptionPage() {
  return (
    <ModulePageShell title="Prescription" description="Buat, tinjau, dan pantau obat dan instruksi perawatan dengan alur yang rapi." badge="Clinical Module">
      <ModuleMetricCards items={[
        { label: 'Draft prescription', value: '6', icon: ClipboardList, tone: 'amber' },
        { label: 'Ready to dispense', value: '4', icon: Pill, tone: 'emerald' },
        { label: 'Need follow-up', value: '2', icon: Stethoscope, tone: 'violet' },
      ]} />

      <div className="grid gap-6 xl:grid-cols-2">
        <ModuleInfoListCard title="Draft prescription" description="Obat yang masih perlu dikonfirmasi dokter." items={['Antibiotik oral 5 hari', 'Vitamin khusus untuk recovery', 'Salep luka 2x sehari']} icon={ClipboardList} />
        <ModuleInfoListCard title="Ready to dispense" description="List obat yang siap diproses oleh tim farmasi atau kasir." items={['Pyrantel 5ml', 'Metronidazole 50mg', 'Shampoo anti-dermatitis']} icon={Pill} />
      </div>
    </ModulePageShell>
  );
}

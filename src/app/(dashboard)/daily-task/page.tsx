import { ModulePageShell } from '@/components/module-page-shell';
import { ModuleInfoListCard, ModuleMetricCards } from '@/components/module-page-blocks';
import { CheckCircle2, ClipboardCheck, TimerReset } from 'lucide-react';

export default function DailyTaskPage() {
  return (
    <ModulePageShell title="Daily Task" description="Kelola pekerjaan operasional harian untuk inventaris, hotel, dan pemeliharaan." badge="Operational Module">
      <ModuleMetricCards items={[
        { label: 'Today tasks', value: '4', icon: ClipboardCheck, tone: 'amber' },
        { label: 'In progress', value: '2', icon: TimerReset, tone: 'sky' },
        { label: 'Completed', value: '3', icon: CheckCircle2, tone: 'emerald' },
      ]} />

      <div className="grid gap-6 xl:grid-cols-2">
        <ModuleInfoListCard title="Today tasks" description="Daftar pekerjaan yang harus diselesaikan hari ini." items={['Cek low stock obat', 'Periksa feeding schedule', 'Bersihkan room VIP', 'Konfirmasi check-in 15.00']} icon={ClipboardCheck} />
        <ModuleInfoListCard title="Completed" description="Status tugas yang sudah selesai." items={['Room standard dibersihkan', 'Restock shampoo hotel', 'Konfirmasi janji temu selesai']} icon={CheckCircle2} />
      </div>
    </ModulePageShell>
  );
}

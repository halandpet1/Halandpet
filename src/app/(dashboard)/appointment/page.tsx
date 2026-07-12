import { ModulePageShell } from '@/components/module-page-shell';
import { ModuleInfoListCard, ModuleMetricCards } from '@/components/module-page-blocks';
import { BellRing, CalendarDays, CheckCircle2 } from 'lucide-react';

export default function AppointmentPage() {
  return (
    <ModulePageShell title="Appointment" description="Pantau jadwal pertemuan, status konsultasi, dan janji temu pelanggan." badge="Customer Portal">
      <ModuleMetricCards items={[
        { label: 'Upcoming', value: '3', icon: CalendarDays, tone: 'sky' },
        { label: 'Completed', value: '8', icon: CheckCircle2, tone: 'emerald' },
        { label: 'Needs reminder', value: '2', icon: BellRing, tone: 'amber' },
      ]} />

      <div className="grid gap-6 xl:grid-cols-2">
        <ModuleInfoListCard title="Upcoming appointments" description="Janji temu yang akan datang dalam 24 jam." items={['10:00 - Luna medical check', '13:30 - Bobo grooming', '16:00 - Piko vaccination']} icon={CalendarDays} />
        <ModuleInfoListCard title="History" description="Riwayat kunjungan yang sudah selesai." items={['Kunjungan minggu lalu - treatment selesai', 'Check-up rutin - status normal']} icon={CheckCircle2} />
      </div>
    </ModulePageShell>
  );
}

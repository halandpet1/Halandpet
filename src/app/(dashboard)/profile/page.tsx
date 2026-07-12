import { ModulePageShell } from '@/components/module-page-shell';
import { ModuleInfoListCard, ModuleMetricCards } from '@/components/module-page-blocks';
import { BadgeCheck, Contact, Settings2 } from 'lucide-react';

export default function ProfilePage() {
  return (
    <ModulePageShell title="Profile" description="Kelola profil pelanggan, preferensi, dan kontak utama." badge="Customer Portal">
      <ModuleMetricCards items={[
        { label: 'Account status', value: 'Verified', icon: BadgeCheck, tone: 'emerald' },
        { label: 'Pets linked', value: '2', icon: Contact, tone: 'sky' },
        { label: 'Preferences', value: '3', icon: Settings2, tone: 'violet' },
      ]} />

      <ModuleInfoListCard title="Account details" description="Rincian data yang tersimpan pada akun pelanggan." items={['Nama: Budi Santoso', 'Email: budi@example.com', 'Telepon: 081234567890', 'Alamat: Bandung']} icon={Contact} />
    </ModulePageShell>
  );
}

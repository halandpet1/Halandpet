import Link from 'next/link';
import { BellRing, PawPrint, ReceiptText } from 'lucide-react';
import { getCustomerPortalOverview, getCustomerPortalReminders, listCustomerNotifications } from '@/actions/portal.actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CustomerPortalProfileEditor from './customer-portal-profile-editor';

export default async function CustomerPortalPage() {
  const [overviewResult, reminderResult, notificationResult] = await Promise.all([
    getCustomerPortalOverview(),
    getCustomerPortalReminders(),
    listCustomerNotifications(),
  ]);

  const result = overviewResult;

  if (!result.success) {
    return (
      <Card className="border-slate-800/80 bg-slate-900/70">
        <CardContent className="p-6">
          <h1 className="text-2xl font-semibold text-white">Portal pelanggan</h1>
          <p className="mt-2 text-sm text-slate-400">{result.error}</p>
        </CardContent>
      </Card>
    );
  }

  const { customer, pets, appointments, invoices, hotelBookings } = result.data;
  const reminders = reminderResult.success ? reminderResult.data.reminders : [];
  const notifications = notificationResult.success ? notificationResult.data.items : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 rounded-3xl border border-slate-800/90 bg-slate-900/70 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
        <div className="flex items-center gap-2">
          <Badge className="border-sky-400/20 bg-sky-500/10 text-sky-300">Portal Pelanggan</Badge>
          <Badge variant="outline" className="border-slate-700 text-slate-300">Self-service</Badge>
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Portal</p>
          <h1 className="text-3xl font-semibold text-white">Halo, {customer.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Pantau janji temu, riwayat transaksi, dan status hotel dari satu layar yang rapi dan mudah dibaca.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sky-300">
              <BellRing className="h-4 w-4" />
              <p className="text-sm text-slate-400">Profil</p>
            </div>
            <p className="mt-3 text-xl font-semibold text-white">{customer.phone ?? '—'}</p>
            <p className="mt-1 text-sm text-slate-400">{customer.email ?? 'Email belum terdaftar'}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-emerald-300">
              <PawPrint className="h-4 w-4" />
              <p className="text-sm text-slate-400">Hewan peliharaan</p>
            </div>
            <p className="mt-3 text-xl font-semibold text-white">{pets.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-amber-300">
              <ReceiptText className="h-4 w-4" />
              <p className="text-sm text-slate-400">Transaksi terbaru</p>
            </div>
            <p className="mt-3 text-xl font-semibold text-white">{invoices.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-800/80 bg-slate-900/70">
        <CardHeader>
          <CardTitle>Reminder & notifikasi</CardTitle>
          <CardDescription>Informasi penting yang perlu diperhatikan pelanggan.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-300">Reminder</h3>
            <ul className="mt-3 space-y-2">
              {reminders.length > 0 ? reminders.map((reminder) => (
                <li key={reminder.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-3 text-sm">
                  <p className="font-medium text-white">{reminder.title}</p>
                  <p className="mt-1 text-slate-400">{reminder.message}</p>
                </li>
              )) : <li className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 px-3 py-3 text-sm text-slate-400">Tidak ada reminder dalam 2 minggu ke depan.</li>}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-300">Notifikasi</h3>
            <ul className="mt-3 space-y-2">
              {notifications.length > 0 ? notifications.map((notification) => (
                <li key={notification.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-3 text-sm">
                  <p className="font-medium text-white">{notification.title}</p>
                  <p className="mt-1 text-slate-400">{notification.message}</p>
                </li>
              )) : <li className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 px-3 py-3 text-sm text-slate-400">Belum ada notifikasi terbaru.</li>}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Hewan peliharaan</CardTitle>
              <CardDescription>Daftar hewan yang terdaftar pada akun pelanggan.</CardDescription>
            </div>
            <Link href="/customers" className="text-sm text-sky-400">Lihat semua</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {pets.map((pet) => (
              <div key={pet.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-3">
                <p className="font-medium text-white">{pet.name}</p>
                <p className="text-sm text-slate-400">{pet.species?.name ?? '—'}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardHeader>
            <CardTitle>Janji temu</CardTitle>
            <CardDescription>Status agenda pemeriksaan dan perawatan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-3">
                <p className="font-medium text-white">{appointment.pet?.name ?? 'Hewan'}</p>
                <p className="text-sm text-slate-400">{appointment.status} • {new Date(appointment.appointmentDate).toLocaleDateString('id-ID')}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CustomerPortalProfileEditor customer={customer} />

        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardHeader>
            <CardTitle>Hotel & boarding</CardTitle>
            <CardDescription>Status menginap dan reservasi hewan peliharaan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {hotelBookings.map((booking) => (
              <div key={booking.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-3">
                <p className="font-medium text-white">{booking.bookingNo}</p>
                <p className="text-sm text-slate-400">{booking.status}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

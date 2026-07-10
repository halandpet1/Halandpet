import Link from 'next/link';
import { getCustomerPortalOverview, getCustomerPortalReminders, listCustomerNotifications } from '@/actions/portal.actions';
import { formatCurrency } from '@/lib/utils';

export default async function CustomerPortalPage() {
  const [overviewResult, reminderResult, notificationResult] = await Promise.all([
    getCustomerPortalOverview(),
    getCustomerPortalReminders(),
    listCustomerNotifications(),
  ]);

  const result = overviewResult;

  if (!result.success) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h1 className="text-2xl font-semibold">Portal pelanggan</h1>
        <p className="mt-2 text-sm text-slate-400">{result.error}</p>
      </div>
    );
  }

  const { customer, pets, appointments, invoices, hotelBookings } = result.data;
  const reminders = reminderResult.success ? reminderResult.data.reminders : [];
  const notifications = notificationResult.success ? notificationResult.data.items : [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Portal</p>
        <h1 className="text-3xl font-semibold">Halo, {customer.name}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Profil</p>
          <p className="mt-3 text-xl font-semibold">{customer.phone ?? '—'}</p>
          <p className="mt-1 text-sm text-slate-400">{customer.email ?? 'Email belum terdaftar'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Hewan peliharaan</p>
          <p className="mt-3 text-xl font-semibold">{pets.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Transaksi terbaru</p>
          <p className="mt-3 text-xl font-semibold">{invoices.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Reminder & notifikasi</h2>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-300">Reminder</h3>
            <ul className="mt-3 space-y-2">
              {reminders.map((reminder) => (
                <li key={reminder.id} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-sm">
                  <p className="font-medium">{reminder.title}</p>
                  <p className="mt-1 text-slate-400">{reminder.message}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-300">Notifikasi</h3>
            <ul className="mt-3 space-y-2">
              {notifications.map((notification) => (
                <li key={notification.id} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-sm">
                  <p className="font-medium">{notification.title}</p>
                  <p className="mt-1 text-slate-400">{notification.message}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Hewan peliharaan</h2>
            <Link href="/customers" className="text-sm text-sky-400">Lihat semua</Link>
          </div>
          <ul className="mt-4 space-y-3">
            {pets.map((pet) => (
              <li key={pet.id} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-3">
                <p className="font-medium">{pet.name}</p>
                <p className="text-sm text-slate-400">{pet.species?.name ?? '—'}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Janji temu</h2>
          <ul className="mt-4 space-y-3">
            {appointments.map((appointment) => (
              <li key={appointment.id} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-3">
                <p className="font-medium">{appointment.pet?.name ?? 'Hewan'}</p>
                <p className="text-sm text-slate-400">{appointment.status} • {new Date(appointment.appointmentDate).toLocaleDateString('id-ID')}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Tagihan</h2>
          <ul className="mt-4 space-y-3">
            {invoices.map((invoice) => (
              <li key={invoice.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950 px-3 py-3">
                <div>
                  <p className="font-medium">{invoice.invoiceNo}</p>
                  <p className="text-sm text-slate-400">{new Date(invoice.createdAt).toLocaleDateString('id-ID')}</p>
                </div>
                <span className="text-sm text-slate-300">{formatCurrency(Number(invoice.total))}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Hotel & boarding</h2>
          <ul className="mt-4 space-y-3">
            {hotelBookings.map((booking) => (
              <li key={booking.id} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-3">
                <p className="font-medium">{booking.bookingNo}</p>
                <p className="text-sm text-slate-400">{booking.status}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

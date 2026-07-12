import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { RoleDashboardExperience } from '@/components/role-dashboard-experience';

export default async function DashboardPage() {
  const sessionUser = await getSessionUser();
  const role = sessionUser?.role ?? 'OWNER';

  if (!db || process.env.NEXT_PHASE === 'phase-production-build') {
    return <RoleDashboardExperience role={role as never} metrics={{ customers: 0, invoices: 0, products: 0, bookings: 0, appointments: 0, revenueToday: 0, revenueMonth: 0, pendingInvoices: 0, lowStockCount: 0, queues: 0, activeTreatments: 0, todaySchedule: 0, openInvoices: 0, pendingPayments: 0, hotelTasks: 0 }} />;
  }

  const [customers, invoices, products, bookings, appointments, revenueTodayResult, revenueMonthResult, lowStockCount, pendingInvoices, activeTreatments, openInvoices, pendingPayments, hotelBookings, queues, todaySchedules] = await Promise.all([
    db.customer.count({ where: { deletedAt: null } }),
    db.invoice.count({ where: { deletedAt: null } }),
    db.product.count({ where: { deletedAt: null } }),
    db.hotelBooking.count({ where: { deletedAt: null, status: { in: ['RESERVED', 'CHECKED_IN', 'WAITING_LIST'] } } }),
    db.appointment.count({ where: { deletedAt: null, status: { in: ['SCHEDULED', 'CHECKED_IN', 'WAITING', 'CONSULTING'] } } }),
    db.invoice.aggregate({ where: { deletedAt: null, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, status: { in: ['PAID', 'PARTIAL'] } }, _sum: { total: true } }),
    db.invoice.aggregate({ where: { deletedAt: null, createdAt: { gte: new Date(new Date(new Date().getFullYear(), new Date().getMonth(), 1)) }, status: { in: ['PAID', 'PARTIAL'] } }, _sum: { total: true } }),
    db.product.count({ where: { deletedAt: null, currentQty: { lte: 5 } } }),
    db.invoice.count({ where: { deletedAt: null, status: { in: ['PENDING', 'PARTIAL'] } } }),
    db.medicalRecord.count({ where: { deletedAt: null, status: 'OPEN' } }),
    db.invoice.count({ where: { deletedAt: null, status: 'PENDING' } }),
    db.invoice.count({ where: { deletedAt: null, status: 'PARTIAL' } }),
    db.hotelBooking.count({ where: { deletedAt: null, status: 'CHECKED_IN' } }),
    db.queue.count({ where: { deletedAt: null, status: 'WAITING' } }),
    db.doctorSchedule.count({ where: { deletedAt: null, scheduleDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)), lte: new Date(new Date().setHours(23, 59, 59, 999)) } } }),
  ]);

  const metrics = {
    customers,
    invoices,
    products,
    bookings,
    appointments,
    revenueToday: Number(revenueTodayResult._sum.total ?? 0),
    revenueMonth: Number(revenueMonthResult._sum.total ?? 0),
    pendingInvoices,
    lowStockCount,
    queues,
    activeTreatments: activeTreatments,
    todaySchedule: todaySchedules,
    openInvoices,
    pendingPayments: pendingPayments,
    hotelTasks: hotelBookings,
  };

  return <RoleDashboardExperience role={role as never} metrics={metrics} />;
}

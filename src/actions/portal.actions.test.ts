import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  customer: { findFirst: vi.fn(), update: vi.fn() },
  pet: { findMany: vi.fn() },
  appointment: { findMany: vi.fn() },
  invoice: { findMany: vi.fn() },
  hotelBooking: { findMany: vi.fn() },
  vaccinationRecord: { findMany: vi.fn() },
  notification: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
  user: { findMany: vi.fn() },
  customerMembership: { findUnique: vi.fn() },
  loyaltyPointLedger: { findMany: vi.fn() },
  voucher: { findMany: vi.fn() },
  promotion: { findMany: vi.fn() },
  auditLog: { create: vi.fn() },
}));

const getSessionUserMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/session', () => ({ getSessionUser: getSessionUserMock }));

import { getCustomerPortalOverview, getCustomerPortalReminders, listCustomerNotifications, markCustomerNotificationRead } from './portal.actions';

describe('getCustomerPortalOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns customer profile and recent activity for the portal dashboard', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-1', role: 'CUSTOMER', fullName: 'Mina' });
    dbMock.customer.findFirst.mockResolvedValue({ id: 'cust-1', name: 'Mina', phone: '0812', email: 'mina@example.com', address: 'Bandung', isWalkIn: false, createdAt: new Date('2024-01-01') });
    dbMock.pet.findMany.mockResolvedValue([{ id: 'pet-1', name: 'Milo' }]);
    dbMock.appointment.findMany.mockResolvedValue([{ id: 'apt-1', status: 'SCHEDULED', appointmentDate: new Date('2024-06-10'), pet: { name: 'Milo' } }]);
    dbMock.invoice.findMany.mockResolvedValue([{ id: 'inv-1', invoiceNo: 'INV-001', status: 'PAID', total: 150000, createdAt: new Date('2024-06-01') }]);
    dbMock.hotelBooking.findMany.mockResolvedValue([{ id: 'booking-1', bookingNo: 'HTL-001', status: 'CHECKED_IN', checkInDate: new Date('2024-06-01'), checkOutDate: new Date('2024-06-03') }]);

    const result = await getCustomerPortalOverview();

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.error);
    }

    expect(result.data.customer.name).toBe('Mina');
    expect(result.data.pets).toHaveLength(1);
    expect(result.data.appointments).toHaveLength(1);
    expect(result.data.invoices).toHaveLength(1);
    expect(result.data.hotelBookings).toHaveLength(1);
  });

  it('returns reminders and notifications for the customer portal', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-1', role: 'CUSTOMER', fullName: 'Mina' });
    dbMock.customer.findFirst.mockResolvedValue({ id: 'cust-1', name: 'Mina' });
    dbMock.appointment.findMany.mockResolvedValue([{ id: 'apt-2', status: 'SCHEDULED', appointmentDate: new Date('2026-07-20'), pet: { name: 'Milo' } }]);
    dbMock.hotelBooking.findMany.mockResolvedValue([{ id: 'booking-2', bookingNo: 'HTL-002', status: 'RESERVED', checkInDate: new Date('2026-07-15'), checkOutDate: new Date('2026-07-18') }]);
    dbMock.vaccinationRecord.findMany.mockResolvedValue([{ id: 'vac-1', vaccineName: 'Rabies', nextDueDate: new Date('2026-07-18') }]);
    dbMock.notification.findMany.mockResolvedValue([{ id: 'notif-1', title: 'Reminder', message: 'Kunjungan besok', isRead: false, createdAt: new Date() }]);

    const remindersResult = await getCustomerPortalReminders();
    const notificationsResult = await listCustomerNotifications();

    expect(remindersResult.success).toBe(true);
    expect(notificationsResult.success).toBe(true);
    if (remindersResult.success) {
      expect(remindersResult.data.reminders.length).toBeGreaterThan(0);
    }
    if (!notificationsResult.success) {
      throw new Error(notificationsResult.error);
    }

    expect(notificationsResult.data.items).toHaveLength(1);
  });

  it('prevents customers from marking notifications they do not own as read', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-1', role: 'CUSTOMER', fullName: 'Mina' });
    dbMock.customer.findFirst.mockResolvedValue({ id: 'cust-1', name: 'Mina' });
    dbMock.notification.findFirst.mockResolvedValue(null);

    const result = await markCustomerNotificationRead('notif-unauthorized');

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected unauthorized update to fail');
    }
    expect(result.error).toBe('Notifikasi tidak ditemukan atau akses ditolak');
  });

  it('marks a customer notification read only when it belongs to them', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-1', role: 'CUSTOMER', fullName: 'Mina' });
    dbMock.customer.findFirst.mockResolvedValue({ id: 'cust-1', name: 'Mina' });
    dbMock.notification.findFirst.mockResolvedValue({ id: 'notif-1', userId: 'user-1', isRead: false });
    dbMock.notification.update.mockResolvedValue({ id: 'notif-1' });

    const result = await markCustomerNotificationRead('notif-1');

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.error);
    }
    expect(result.data?.id).toBe('notif-1');
    expect(dbMock.notification.update).toHaveBeenCalledWith({ where: { id: 'notif-1' }, data: { isRead: true } });
  });
});

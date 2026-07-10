import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  clinicSetting: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  auditLog: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
  invoice: { aggregate: vi.fn(), count: vi.fn() },
  customer: { count: vi.fn() },
  product: { count: vi.fn() },
  hotelBooking: { count: vi.fn() },
  appointment: { count: vi.fn() },
  notification: { findMany: vi.fn() },
}));

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/session', () => ({ getSessionUser: vi.fn().mockResolvedValue({ id: 'user-1', role: 'OWNER', fullName: 'Owner' }) }));

import { getAdministrationOverview, getSystemMonitoringSummary, getSystemSettings } from './enterprise.actions';

describe('enterprise actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns clinic settings and business summary', async () => {
    dbMock.clinicSetting.findFirst.mockResolvedValue({ id: 'setting-1', clinicName: 'HaLand', taxRate: 10, currency: 'IDR', isOpen: true, timezone: 'Asia/Jakarta', locale: 'id-ID' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'OWNER', isActive: true, deletedAt: null });
    dbMock.invoice.aggregate.mockResolvedValue({ _sum: { total: 1200000 } });
    dbMock.customer.count.mockResolvedValue(12);
    dbMock.product.count.mockResolvedValue(8);
    dbMock.hotelBooking.count.mockResolvedValue(3);
    dbMock.appointment.count.mockResolvedValue(5);

    const result = await getSystemSettings();

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.error);
    }

    expect(result.data.settings.clinicName).toBe('HaLand');
    expect(result.data.summary.revenue).toBeGreaterThan(0);
  });

  it('returns administration overview and recent activity', async () => {
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'OWNER', isActive: true, deletedAt: null });
    dbMock.user.findMany.mockResolvedValue([{ id: 'u-2', username: 'doc1', fullName: 'Dr. Budi', role: 'DOCTOR', isActive: true, deletedAt: null }]);
    dbMock.auditLog.findMany.mockResolvedValue([{ id: 'log-1', action: 'CREATE', entity: 'Invoice', createdAt: new Date() }]);

    const result = await getAdministrationOverview();

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.error);
    }

    expect(result.data.users).toHaveLength(1);
    expect(result.data.auditLogs).toHaveLength(1);
  });

  it('returns monitoring summary widgets', async () => {
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'OWNER', isActive: true, deletedAt: null });
    dbMock.invoice.aggregate.mockResolvedValue({ _sum: { total: 800000 } });
    dbMock.customer.count.mockResolvedValue(20);
    dbMock.product.count.mockResolvedValue(10);
    dbMock.hotelBooking.count.mockResolvedValue(4);
    dbMock.appointment.count.mockResolvedValue(7);
    dbMock.auditLog.findMany.mockResolvedValue([{ id: 'log-1', action: 'UPDATE', entity: 'ClinicSetting', createdAt: new Date() }]);

    const result = await getSystemMonitoringSummary();

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.error);
    }

    expect(result.data.widgets.revenueToday).toBeGreaterThan(0);
    expect(result.data.widgets.appointmentQueue).toBeGreaterThan(0);
  });
});

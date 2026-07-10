import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  invoice: { findMany: vi.fn() },
  invoiceItem: { findMany: vi.fn() },
  product: { findMany: vi.fn() },
  appointment: { findMany: vi.fn() },
  hotelBooking: { findMany: vi.fn() },
  customer: { count: vi.fn() },
  user: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
}));

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/session', () => ({ getSessionUser: vi.fn().mockResolvedValue({ id: 'user-1', role: 'OWNER', fullName: 'Owner' }) }));

import { getEnterpriseReportingSummary } from './reporting.actions';

describe('getEnterpriseReportingSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds enterprise reporting metrics from existing datasets', async () => {
    dbMock.invoice.findMany.mockResolvedValue([
      { id: 'inv-1', total: 150000, paidAmount: 150000, status: 'PAID', createdAt: new Date('2026-06-01') },
      { id: 'inv-2', total: 80000, paidAmount: 30000, status: 'PARTIAL', createdAt: new Date('2026-06-20') },
    ]);
    dbMock.invoiceItem.findMany.mockResolvedValue([{ productId: 'prod-1', qty: 3, total: 90000 }]);
    dbMock.product.findMany.mockResolvedValue([{ id: 'prod-1', name: 'Royal Canin', currentQty: 4, minStock: 5, costPrice: 20000, sellingPrice: 50000 }, { id: 'prod-2', name: 'Shampoo', currentQty: 1, minStock: 3, costPrice: 15000, sellingPrice: 25000 }]);
    dbMock.appointment.findMany.mockResolvedValue([{ id: 'apt-1', status: 'SCHEDULED', appointmentDate: new Date('2026-06-15') }]);
    dbMock.hotelBooking.findMany.mockResolvedValue([{ id: 'htl-1', status: 'CHECKED_IN', checkInDate: new Date('2026-06-15'), checkOutDate: new Date('2026-06-18') }]);
    dbMock.customer.count.mockResolvedValue(12);
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'OWNER', isActive: true, deletedAt: null });

    const result = await getEnterpriseReportingSummary({ period: 'monthly' });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.error);
    }

    expect(result.data.summary.revenue).toBeGreaterThan(0);
    expect(result.data.summary.outstanding).toBeGreaterThan(0);
    expect(result.data.series.length).toBeGreaterThan(0);
    expect(result.data.inventoryAlerts.length).toBeGreaterThan(0);
  });
});

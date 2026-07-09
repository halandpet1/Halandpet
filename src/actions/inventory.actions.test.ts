import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  product: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
  inventoryBatch: { findMany: vi.fn() },
  stockMovement: { create: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

const getSessionUserMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/session', () => ({ getSessionUser: getSessionUserMock }));

import { createDispensing } from './inventory.actions';

describe('createDispensing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.$transaction.mockImplementation(async (callback: (tx: typeof dbMock) => Promise<unknown>) => callback(dbMock));
  });

  it('creates a dispensing transaction for a batch-based medicine', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-1', role: 'STAFF', fullName: 'Staff' });
    dbMock.user = { findUnique: vi.fn().mockResolvedValue({ id: 'user-1', role: 'STAFF', isActive: true, deletedAt: null }) } as never;
    dbMock.product.findFirst.mockResolvedValue({ id: 'product-1', name: 'Paracetamol', requiresBatch: true, currentQty: 10 });
    dbMock.inventoryBatch.findMany.mockResolvedValue([{ id: 'batch-1', currentQty: 10, expiryDate: new Date('2030-01-01') }]);

    const result = await createDispensing({ productId: 'product-1', delta: 2, notes: 'Dispensed' });

    expect(result.success).toBe(true);
    expect(dbMock.stockMovement.create).toHaveBeenCalled();
  });
});

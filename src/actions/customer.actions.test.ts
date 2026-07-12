import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  customer: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

const revalidateCustomerViewsMock = vi.hoisted(() => vi.fn());
const requireRoleMock = vi.hoisted(() => vi.fn());
const loggerErrorMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/action-utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/action-utils')>('@/lib/action-utils');
  return { ...actual, requireRole: requireRoleMock, revalidateCustomerViews: revalidateCustomerViewsMock };
});
vi.mock('@/lib/logger', () => ({ logger: { error: loggerErrorMock } }));

import { createCustomer, softDeleteCustomer } from './customer.actions';

describe('customer actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback(dbMock));
    requireRoleMock.mockResolvedValue({ id: 'user-1', role: 'ADMIN' });
    revalidateCustomerViewsMock.mockResolvedValue(undefined);
  });

  it('creates a customer successfully', async () => {
    dbMock.customer.create.mockResolvedValue({ id: 'cust-1' });
    dbMock.auditLog.create.mockResolvedValue({});

    const result = await createCustomer({ name: 'Ayu', phone: '0812', email: 'ayu@example.com' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('cust-1');
    }
  });

  it('returns a friendly error when soft delete fails', async () => {
    dbMock.$transaction.mockRejectedValueOnce(new Error('boom'));

    const result = await softDeleteCustomer('cust-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Terjadi kesalahan, coba lagi');
    }
    expect(loggerErrorMock).toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  vaccinationRecord: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  weightHistory: { create: vi.fn() },
  auditLog: { create: vi.fn() },
  pet: { findFirst: vi.fn() },
  customer: { findFirst: vi.fn() },
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

import { createVaccination, createWeight } from './medical-history.actions';

describe('medical history actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback(dbMock));
    requireRoleMock.mockResolvedValue({ id: 'user-1', role: 'CUSTOMER' });
    revalidateCustomerViewsMock.mockResolvedValue(undefined);
  });

  it('creates a vaccination record successfully', async () => {
    dbMock.pet.findFirst.mockResolvedValue({ id: 'pet-1' });
    dbMock.customer.findFirst.mockResolvedValue({ id: 'cust-1' });
    dbMock.vaccinationRecord.create.mockResolvedValue({ id: 'vac-1' });
    dbMock.auditLog.create.mockResolvedValue({});

    const result = await createVaccination({ petId: 'pet-1', vaccineName: 'Rabies', date: '2026-07-20' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('vac-1');
    }
  });

  it('returns a friendly error when weight creation fails', async () => {
    dbMock.pet.findFirst.mockResolvedValue({ id: 'pet-1' });
    dbMock.customer.findFirst.mockResolvedValue({ id: 'cust-1' });
    dbMock.$transaction.mockRejectedValueOnce(new Error('boom'));

    const result = await createWeight({ petId: 'pet-1', date: '2026-07-20', weight: 4.5 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Terjadi kesalahan, coba lagi');
    }
    expect(loggerErrorMock).toHaveBeenCalled();
  });
});

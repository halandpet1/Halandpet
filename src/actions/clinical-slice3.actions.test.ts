import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  medicalRecord: { findFirst: vi.fn() },
  diagnosis: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  treatmentPlan: { findFirst: vi.fn(), create: vi.fn() },
  prescription: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  followUp: { create: vi.fn() },
  auditLog: { create: vi.fn() },
  product: { findFirst: vi.fn(), update: vi.fn() },
  inventoryBatch: { findMany: vi.fn(), update: vi.fn() },
  stockMovement: { create: vi.fn() },
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
vi.mock('@/lib/inventory-utils', () => ({ allocateFefoBatches: vi.fn(() => []) }));

import { createDiagnosis, createPrescription } from './clinical-slice3.actions';

describe('clinical slice 3 actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback(dbMock));
    requireRoleMock.mockResolvedValue({ id: 'user-1', role: 'DOCTOR' });
    revalidateCustomerViewsMock.mockResolvedValue(undefined);
  });

  it('creates diagnosis successfully', async () => {
    dbMock.medicalRecord.findFirst.mockResolvedValue({ id: 'mr-1', appointmentId: 'apt-1', status: 'OPEN' });
    dbMock.diagnosis.findFirst.mockResolvedValue(null);
    dbMock.diagnosis.create.mockResolvedValue({ id: 'diag-1' });
    dbMock.auditLog.create.mockResolvedValue({});

    const result = await createDiagnosis({ medicalRecordId: 'mr-1', primaryDiagnosis: 'Flu' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('diag-1');
    }
  });

  it('returns a friendly error when prescription creation fails', async () => {
    dbMock.diagnosis.findFirst.mockResolvedValue({ id: 'diag-1', medicalRecordId: 'mr-1', isLocked: true });
    dbMock.product.findFirst.mockResolvedValue({ id: 'prod-1', name: 'Vit C', requiresBatch: false, currentQty: 10 });
    dbMock.$transaction.mockRejectedValueOnce(new Error('boom'));

    const result = await createPrescription({ medicalRecordId: 'mr-1', diagnosisId: 'diag-1', productId: 'prod-1', medicine: 'Vit C', quantity: 1, refill: 0, status: 'PRESCRIBED', dosage: '1x', frequency: '1x', duration: '3d', instructions: 'Minum' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Terjadi kesalahan, coba lagi');
    }
    expect(loggerErrorMock).toHaveBeenCalled();
  });
});

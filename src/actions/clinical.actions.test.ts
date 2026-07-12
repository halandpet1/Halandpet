import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  appointment: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  medicalRecord: { findFirst: vi.fn(), create: vi.fn() },
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

import { createAppointment, createMedicalRecord } from './clinical.actions';

describe('clinical actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback(dbMock));
    requireRoleMock.mockResolvedValue({ id: 'user-1', role: 'DOCTOR' });
    revalidateCustomerViewsMock.mockResolvedValue(undefined);
  });

  it('creates an appointment successfully', async () => {
    dbMock.appointment.create.mockResolvedValue({ id: 'apt-1' });
    dbMock.auditLog.create.mockResolvedValue({});

    const result = await createAppointment({ customerId: 'cust-1', petId: 'pet-1', appointmentDate: '2026-07-20', status: 'SCHEDULED' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('apt-1');
    }
    expect(dbMock.appointment.create).toHaveBeenCalled();
  });

  it('returns a friendly error when medical record creation fails', async () => {
    dbMock.appointment.findFirst.mockResolvedValue({ id: 'apt-1', customerId: 'cust-1', petId: 'pet-1', doctorId: 'user-1', status: 'SCHEDULED' });
    dbMock.medicalRecord.findFirst.mockResolvedValue(null);
    dbMock.$transaction.mockRejectedValueOnce(new Error('boom'));

    const result = await createMedicalRecord({ appointmentId: 'apt-1', notes: 'ok', status: 'OPEN' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Terjadi kesalahan, coba lagi');
    }
    expect(loggerErrorMock).toHaveBeenCalled();
  });
});

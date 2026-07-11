import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  medicalRecord: { findFirst: vi.fn() },
  appointment: { findFirst: vi.fn() },
  diagnosis: { findFirst: vi.fn() },
  treatmentPlan: { findFirst: vi.fn() },
  soapNote: { findFirst: vi.fn() },
  vitalSignRecord: { findMany: vi.fn() },
  attachment: { findMany: vi.fn() },
  prescription: { findMany: vi.fn() },
  vaccinationRecord: { findMany: vi.fn() },
  weightHistory: { findMany: vi.fn() },
  allergy: { findMany: vi.fn() },
  diseaseHistory: { findMany: vi.fn() },
}));

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/action-utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/action-utils')>('@/lib/action-utils');
  return { ...actual, requireRole: vi.fn().mockResolvedValue({ id: 'doctor-1', role: 'DOCTOR', fullName: 'Dr. Test' }) };
});

import { getClinicalTimeline } from './clinical-slice2.actions';

describe('clinical slice2 actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns concrete timeline titles instead of placeholder labels', async () => {
    dbMock.medicalRecord.findFirst.mockResolvedValue({
      id: 'mr-1',
      notes: 'Follow up needed',
      status: 'OPEN',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      appointmentId: 'appt-1',
    });
    dbMock.appointment.findFirst.mockResolvedValue({
      id: 'appt-1',
      appointmentDate: new Date('2026-01-01T00:00:00.000Z'),
      status: 'COMPLETED',
      customer: { id: 'cust-1', name: 'Budi' },
      pet: { id: 'pet-1', name: 'Milo' },
    });
    dbMock.diagnosis.findFirst.mockResolvedValue({ id: 'diag-1', primaryDiagnosis: 'Fever', clinicalNotes: 'Mild fever' });
    dbMock.treatmentPlan.findFirst.mockResolvedValue({ id: 'tp-1', procedure: 'Observation', observation: 'Monitor' });
    dbMock.soapNote.findFirst.mockResolvedValue(null);
    dbMock.vitalSignRecord.findMany.mockResolvedValue([]);
    dbMock.attachment.findMany.mockResolvedValue([]);
    dbMock.prescription.findMany.mockResolvedValue([]);
    dbMock.vaccinationRecord.findMany.mockResolvedValue([]);
    dbMock.weightHistory.findMany.mockResolvedValue([]);
    dbMock.allergy.findMany.mockResolvedValue([]);
    dbMock.diseaseHistory.findMany.mockResolvedValue([]);

    const result = await getClinicalTimeline('mr-1');

    expect(result.success).toBe(true);
    expect(result.success && result.data?.timelineItems.some((item) => item.title === 'Diagnosis' && item.detail.includes('Fever'))).toBe(true);
    expect(result.success && result.data?.timelineItems.some((item) => item.title === 'Treatment Plan')).toBe(true);
    expect(result.success && result.data?.timelineItems.some((item) => item.title === 'Prescription')).toBe(true);
    expect(result.success && result.data?.timelineItems.some((item) => item.title.includes('placeholder'))).toBe(false);
  });
});

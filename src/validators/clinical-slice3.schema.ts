import { z } from 'zod';

export const diagnosisSchema = z.object({
  medicalRecordId: z.string().trim().min(1, 'Rekam medis wajib dipilih'),
  primaryDiagnosis: z.string().trim().optional().or(z.literal('')),
  secondaryDiagnosis: z.string().trim().optional().or(z.literal('')),
  differentialDiagnosis: z.string().trim().optional().or(z.literal('')),
  clinicalNotes: z.string().trim().optional().or(z.literal('')),
  isLocked: z.boolean().optional(),
});

export const treatmentPlanSchema = z.object({
  medicalRecordId: z.string().trim().min(1, 'Rekam medis wajib dipilih'),
  medicalTreatment: z.string().trim().optional().or(z.literal('')),
  procedure: z.string().trim().optional().or(z.literal('')),
  observation: z.string().trim().optional().or(z.literal('')),
  hospitalizationRecommendation: z.string().trim().optional().or(z.literal('')),
  followUpRecommendation: z.string().trim().optional().or(z.literal('')),
});

export const prescriptionSchema = z.object({
  medicalRecordId: z.string().trim().min(1, 'Rekam medis wajib dipilih'),
  diagnosisId: z.string().trim().min(1, 'Diagnosis wajib dipilih'),
  productId: z.string().trim().min(1, 'Obat wajib dipilih'),
  medicine: z.string().trim().min(1, 'Nama obat wajib diisi'),
  dosage: z.string().trim().optional().or(z.literal('')),
  frequency: z.string().trim().optional().or(z.literal('')),
  duration: z.string().trim().optional().or(z.literal('')),
  instructions: z.string().trim().optional().or(z.literal('')),
  quantity: z.coerce.number().int().min(1).default(1),
  refill: z.coerce.number().int().min(0).default(0),
  warnings: z.string().trim().optional().or(z.literal('')),
  status: z.enum(['PRESCRIBED', 'DISPENSED', 'CANCELLED']).optional().default('PRESCRIBED'),
});

export const followUpSchema = z.object({
  medicalRecordId: z.string().trim().min(1, 'Rekam medis wajib dipilih'),
  nextVisitDate: z.string().trim().optional().or(z.literal('')),
  reminder: z.string().trim().optional().or(z.literal('')),
  reason: z.string().trim().optional().or(z.literal('')),
  status: z.string().trim().optional().or(z.literal('SCHEDULED')),
});

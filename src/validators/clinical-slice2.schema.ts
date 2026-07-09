import { z } from 'zod';

export const doctorScheduleSchema = z.object({
  doctorId: z.string().trim().min(1, 'Dokter wajib dipilih'),
  scheduleDate: z.string().trim().min(1, 'Tanggal jadwal wajib diisi'),
  startTime: z.string().trim().min(1, 'Jam mulai wajib diisi'),
  endTime: z.string().trim().min(1, 'Jam selesai wajib diisi'),
  breakStartTime: z.string().trim().optional().or(z.literal('')),
  breakEndTime: z.string().trim().optional().or(z.literal('')),
  status: z.string().trim().optional().or(z.literal('WORKING')),
  maxPatients: z.coerce.number().int().min(1).max(100).optional().default(10),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const queueSchema = z.object({
  appointmentId: z.string().trim().min(1, 'Appointment wajib dipilih'),
  doctorId: z.string().trim().optional().or(z.literal('')),
  queueDate: z.string().trim().min(1, 'Tanggal antrian wajib diisi'),
  queueNo: z.coerce.number().int().min(1),
  status: z.enum(['WAITING', 'CALLED', 'SKIPPED', 'COMPLETED', 'CANCELLED']).optional(),
  estimatedWaitingMinutes: z.coerce.number().int().min(0).optional().nullable(),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const soapSchema = z.object({
  medicalRecordId: z.string().trim().min(1, 'Rekam medis wajib dipilih'),
  doctorId: z.string().trim().optional().or(z.literal('')),
  subjective: z.string().trim().optional().or(z.literal('')),
  objective: z.string().trim().optional().or(z.literal('')),
  assessment: z.string().trim().optional().or(z.literal('')),
  plan: z.string().trim().optional().or(z.literal('')),
  isLocked: z.boolean().optional(),
});

export const vitalSignSchema = z.object({
  medicalRecordId: z.string().trim().min(1, 'Rekam medis wajib dipilih'),
  temperature: z.coerce.number().min(0).max(100).optional().nullable(),
  weight: z.coerce.number().min(0).max(1000).optional().nullable(),
  heartRate: z.coerce.number().int().min(0).max(300).optional().nullable(),
  respiratoryRate: z.coerce.number().int().min(0).max(200).optional().nullable(),
  bloodPressure: z.string().trim().optional().or(z.literal('')),
  bodyCondition: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
});

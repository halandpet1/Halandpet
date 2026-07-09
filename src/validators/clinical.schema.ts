import { z } from 'zod';

export const appointmentSchema = z.object({
  customerId: z.string().trim().min(1, 'Pilih pelanggan'),
  petId: z.string().trim().min(1, 'Pilih hewan'),
  doctorId: z.string().trim().optional().or(z.literal('')),
  appointmentDate: z.string().trim().min(1, 'Tanggal janji wajib diisi'),
  status: z.enum(['SCHEDULED', 'CHECKED_IN', 'WAITING', 'CONSULTING', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const medicalRecordSchema = z.object({
  appointmentId: z.string().trim().min(1, 'Appointment wajib dipilih'),
  diagnosis: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
  status: z.string().trim().optional().or(z.literal('OPEN')),
});

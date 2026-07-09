import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter'),
  phone: z.string().trim().optional().or(z.literal('')),
  email: z.string().trim().email('Email tidak valid').optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  isWalkIn: z.boolean().optional().default(false),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const customerUpdateSchema = customerSchema.partial();

export const petSchema = z.object({
  customerId: z.string().min(1, 'Pelanggan wajib dipilih'),
  name: z.string().trim().min(2, 'Nama hewan minimal 2 karakter'),
  speciesId: z.string().min(1, 'Spesies wajib dipilih'),
  breedId: z.string().optional().or(z.literal('')),
  colorId: z.string().optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'UNKNOWN']).default('UNKNOWN'),
  dateOfBirth: z.string().optional().or(z.literal('')),
  isSterile: z.boolean().optional().default(false),
  microchipNumber: z.string().trim().optional().or(z.literal('')),
  photoUrl: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const petUpdateSchema = petSchema.partial();

export const speciesSchema = z.object({
  name: z.string().trim().min(2, 'Nama spesies minimal 2 karakter'),
  isActive: z.boolean().optional().default(true),
});

export const breedSchema = z.object({
  speciesId: z.string().min(1, 'Spesies wajib dipilih'),
  name: z.string().trim().min(2, 'Nama ras minimal 2 karakter'),
  isActive: z.boolean().optional().default(true),
});

export const colorSchema = z.object({
  name: z.string().trim().min(2, 'Nama warna minimal 2 karakter'),
  isActive: z.boolean().optional().default(true),
});

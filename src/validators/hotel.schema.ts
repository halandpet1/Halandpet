import { z } from 'zod';

export const createHotelBookingSchema = z.object({
  customerId: z.string().trim().min(1),
  petId: z.string().trim().min(1),
  roomTypeId: z.string().trim().min(1),
  bookingType: z.enum(['BOARDING', 'GROOMING', 'DAYCARE', 'HOTEL']).default('BOARDING'),
  checkInDate: z.string().trim().min(1),
  checkOutDate: z.string().trim().min(1),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const hotelCheckInSchema = z.object({ bookingId: z.string().trim().min(1) });

export const hotelCheckOutSchema = z.object({
  bookingId: z.string().trim().min(1),
  paymentMethod: z.enum(['CASH', 'CARD', 'DEBIT', 'QRIS', 'TRANSFER']).default('CASH'),
  amountPaid: z.coerce.number().min(0).default(0),
});

export const hotelDailyLogSchema = z.object({
  bookingId: z.string().trim().min(1),
  notes: z.string().trim().optional().or(z.literal('')),
  feeding: z.boolean().default(false),
  medication: z.boolean().default(false),
  walking: z.boolean().default(false),
  bath: z.boolean().default(false),
  play: z.boolean().default(false),
  weight: z.coerce.number().optional(),
  temperature: z.coerce.number().optional(),
});

export const hotelInventoryUsageSchema = z.object({
  bookingId: z.string().trim().min(1),
  productId: z.string().trim().min(1),
  qty: z.coerce.number().int().min(1),
  notes: z.string().trim().optional().or(z.literal('')),
});

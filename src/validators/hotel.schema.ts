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

export const hotelAssignRoomSchema = z.object({
  bookingId: z.string().trim().min(1),
  roomId: z.string().trim().min(1),
});

export const hotelRescheduleSchema = z.object({
  bookingId: z.string().trim().min(1),
  checkInDate: z.string().trim().min(1),
  checkOutDate: z.string().trim().min(1),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const hotelStayExtensionSchema = z.object({
  bookingId: z.string().trim().min(1),
  additionalNights: z.coerce.number().int().min(1).default(1),
});

export const hotelBookingUpdateSchema = z.object({
  bookingId: z.string().trim().min(1),
  status: z.enum(['RESERVED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'WAITING_LIST', 'NO_SHOW']).optional(),
  cancellationReason: z.string().trim().optional().or(z.literal('')),
  checkInDate: z.string().trim().optional().or(z.literal('')),
  checkOutDate: z.string().trim().optional().or(z.literal('')),
});

export const hotelAvailabilitySchema = z.object({
  roomTypeId: z.string().trim().optional().or(z.literal('')),
  checkInDate: z.string().trim().min(1),
  checkOutDate: z.string().trim().min(1),
});

export const hotelCheckInSchema = z.object({ bookingId: z.string().trim().min(1) });

export const hotelCheckOutSchema = z.object({
  bookingId: z.string().trim().min(1),
  paymentMethod: z.enum(['CASH', 'CARD', 'DEBIT', 'QRIS', 'TRANSFER']).default('CASH'),
  amountPaid: z.coerce.number().min(0).default(0),
});

export const hotelRoomSchema = z.object({
  roomNo: z.string().trim().min(1),
  name: z.string().trim().min(1),
  type: z.string().trim().min(1),
  roomTypeId: z.string().trim().optional().or(z.literal('')),
  ratePerNight: z.coerce.number().min(0).default(0),
  capacity: z.coerce.number().int().min(1).default(1),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE', 'OUT_OF_SERVICE']).default('AVAILABLE'),
  cleaningStatus: z.enum(['CLEAN', 'DIRTY', 'IN_PROGRESS']).default('CLEAN'),
});

export const hotelRoomStatusSchema = z.object({
  roomId: z.string().trim().min(1),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE', 'OUT_OF_SERVICE']).optional(),
  cleaningStatus: z.enum(['CLEAN', 'DIRTY', 'IN_PROGRESS']).optional(),
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

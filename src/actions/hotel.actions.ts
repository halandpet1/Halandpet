'use server';

import { Prisma, type PaymentMethod, type UserRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { parseOrFail, type ActionResult } from '@/lib/action-utils';

const hotelRoles: UserRole[] = ['OWNER', 'ADMIN', 'CASHIER', 'STAFF'];

async function assertRole(allowedRoles: UserRole[]) {
  if (!db) return null;
  const user = await getSessionUser();
  if (!user) return null;

  const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { id: true, role: true, isActive: true, deletedAt: true } });
  if (!dbUser || dbUser.deletedAt || !dbUser.isActive || !allowedRoles.includes(dbUser.role)) {
    return null;
  }

  return { id: dbUser.id, role: dbUser.role, fullName: user.fullName };
}

function createBookingNumber() {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `HTL-${yearMonth}-${String(Date.now()).slice(-4)}`;
}

function createInvoiceNumber() {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `INV-${yearMonth}-${String(Date.now()).slice(-5)}`;
}

export async function createHotelBooking(rawData: unknown): Promise<ActionResult<{ id: string; bookingNo: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(hotelRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const bookingSchema = z.object({
    customerId: z.string().trim().min(1),
    petId: z.string().trim().min(1),
    roomTypeId: z.string().trim().min(1),
    bookingType: z.enum(['BOARDING', 'GROOMING', 'DAYCARE', 'HOTEL']).default('BOARDING'),
    checkInDate: z.string().trim().min(1),
    checkOutDate: z.string().trim().min(1),
    notes: z.string().trim().optional().or(z.literal('')),
  });
  const parsed = await parseOrFail(bookingSchema, rawData);
  if (!parsed.success) return parsed;

  const customer = await db.customer.findUnique({ where: { id: parsed.data.customerId }, select: { id: true } });
  const pet = await db.pet.findUnique({ where: { id: parsed.data.petId }, select: { id: true } });
  if (!customer || !pet) return { success: false, error: 'Customer atau hewan tidak ditemukan' };

  const availableRooms = await db.hotelRoom.findMany({
    where: { deletedAt: null, type: parsed.data.roomTypeId, status: 'AVAILABLE', cleaningStatus: 'CLEAN' },
    select: { id: true, roomNo: true, capacity: true, status: true, cleaningStatus: true, ratePerNight: true },
  });

  if (!availableRooms.length) return { success: false, error: 'Tidak ada kamar yang tersedia' };

  const room = availableRooms[0];
  const checkIn = new Date(parsed.data.checkInDate);
  const checkOut = new Date(parsed.data.checkOutDate);
  const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
  const totalAmount = Number(room.ratePerNight) * nights;

  const booking = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.hotelBooking.create({
      data: {
        bookingNo: createBookingNumber(),
        customerId: parsed.data.customerId,
        petId: parsed.data.petId,
        roomId: room.id,
        roomTypeId: parsed.data.roomTypeId,
        bookingType: parsed.data.bookingType,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        status: 'RESERVED',
        totalAmount,
        roomCharge: totalAmount,
        notes: parsed.data.notes || null,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });

    await tx.hotelRoom.update({ where: { id: room.id }, data: { status: 'RESERVED' } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'HotelBooking', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
    return created;
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/hotel');
    revalidatePath('/dashboard');
  }

  return { success: true, data: { id: booking.id, bookingNo: booking.bookingNo } };
}

export async function checkInHotelBooking(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(hotelRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const schema = z.object({ bookingId: z.string().trim().min(1) });
  const parsed = await parseOrFail(schema, rawData);
  if (!parsed.success) return parsed;

  const booking = await db.hotelBooking.findUnique({ where: { id: parsed.data.bookingId }, select: { id: true, status: true, roomId: true } });
  if (!booking) return { success: false, error: 'Booking tidak ditemukan' };
  if (booking.status !== 'RESERVED') return { success: false, error: 'Booking tidak dapat check in' };

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.hotelBooking.update({ where: { id: booking.id }, data: { status: 'CHECKED_IN', checkedInAt: new Date(), updatedBy: actor.id } });
    await tx.hotelRoom.update({ where: { id: booking.roomId }, data: { status: 'OCCUPIED', cleaningStatus: 'USED' } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CHECK_IN', entity: 'HotelBooking', entityId: booking.id, changes: { bookingId: booking.id } as Prisma.InputJsonValue } });
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') revalidatePath('/hotel');
  return { success: true, data: { id: booking.id } };
}

export async function checkOutHotelBooking(rawData: unknown): Promise<ActionResult<{ id: string; invoiceId: string | null }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(['OWNER', 'ADMIN', 'CASHIER']);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const schema = z.object({ bookingId: z.string().trim().min(1), paymentMethod: z.enum(['CASH', 'CARD', 'DEBIT', 'QRIS', 'TRANSFER']).default('CASH'), amountPaid: z.coerce.number().min(0).default(0) });
  const parsed = await parseOrFail(schema, rawData);
  if (!parsed.success) return parsed;

  const booking = await db.hotelBooking.findUnique({ where: { id: parsed.data.bookingId }, select: { id: true, status: true, roomId: true, customerId: true, totalAmount: true, roomCharge: true, foodCharge: true, medicationCharge: true, groomingCharge: true, additionalServiceCharge: true, damageFee: true, lateCheckoutFee: true } });
  if (!booking) return { success: false, error: 'Booking tidak ditemukan' };
  if (booking.status !== 'CHECKED_IN') return { success: false, error: 'Booking belum check in' };

  const invoiceTotal = Number(booking.totalAmount ?? 0) + Number(booking.roomCharge ?? 0) + Number(booking.foodCharge ?? 0) + Number(booking.medicationCharge ?? 0) + Number(booking.groomingCharge ?? 0) + Number(booking.additionalServiceCharge ?? 0) + Number(booking.damageFee ?? 0) + Number(booking.lateCheckoutFee ?? 0);

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const invoice = await tx.invoice.create({
      data: {
        invoiceNo: createInvoiceNumber(),
        customerId: booking.customerId,
        status: 'PAID',
        source: 'HOTEL',
        subtotal: invoiceTotal,
        tax: 0,
        discount: 0,
        total: invoiceTotal,
        paidAmount: parsed.data.amountPaid,
        notes: 'Hotel checkout',
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });

    await tx.invoiceItem.create({ data: { invoiceId: invoice.id, description: 'Hotel stay', qty: 1, unitPrice: invoiceTotal, total: invoiceTotal } });
    await tx.payment.create({ data: { invoiceId: invoice.id, method: parsed.data.paymentMethod as PaymentMethod, amount: parsed.data.amountPaid, referenceNo: null, status: 'SUCCESS', createdBy: actor.id } });
    await tx.hotelBooking.update({ where: { id: booking.id }, data: { status: 'CHECKED_OUT', checkedOutAt: new Date(), updatedBy: actor.id } });
    await tx.hotelRoom.update({ where: { id: booking.roomId }, data: { status: 'AVAILABLE', cleaningStatus: 'CLEAN' } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CHECK_OUT', entity: 'HotelBooking', entityId: booking.id, changes: { bookingId: booking.id, amountPaid: parsed.data.amountPaid } as Prisma.InputJsonValue } });
    return invoice;
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') revalidatePath('/hotel');
  return { success: true, data: { id: booking.id, invoiceId: result.id } };
}

export async function createHotelRoom(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(['OWNER', 'ADMIN']);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const roomSchema = z.object({ roomNo: z.string().trim().min(1), name: z.string().trim().min(1), type: z.string().trim().min(1), roomTypeId: z.string().trim().optional().or(z.literal('')), ratePerNight: z.coerce.number().min(0).default(0), capacity: z.coerce.number().int().min(1).default(1), status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE', 'OUT_OF_SERVICE']).default('AVAILABLE'), cleaningStatus: z.enum(['CLEAN', 'DIRTY', 'IN_PROGRESS']).default('CLEAN') });
  const parsed = await parseOrFail(roomSchema, rawData);
  if (!parsed.success) return parsed;

  const room = await db.hotelRoom.create({ data: { roomNo: parsed.data.roomNo, name: parsed.data.name, type: parsed.data.type, roomTypeId: parsed.data.roomTypeId || null, ratePerNight: parsed.data.ratePerNight, capacity: parsed.data.capacity, status: parsed.data.status, cleaningStatus: parsed.data.cleaningStatus, isActive: true } });
  await db.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'HotelRoom', entityId: room.id, changes: parsed.data as Prisma.InputJsonValue } });
  return { success: true, data: { id: room.id } };
}

export async function updateHotelRoomStatus(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(['OWNER', 'ADMIN']);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const schema = z.object({ roomId: z.string().trim().min(1), status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE', 'OUT_OF_SERVICE']).optional(), cleaningStatus: z.enum(['CLEAN', 'DIRTY', 'IN_PROGRESS']).optional() });
  const parsed = await parseOrFail(schema, rawData);
  if (!parsed.success) return parsed;

  const room = await db.hotelRoom.findUnique({ where: { id: parsed.data.roomId }, select: { id: true } });
  if (!room) return { success: false, error: 'Kamar tidak ditemukan' };

  const updated = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const nextRoom = await tx.hotelRoom.update({ where: { id: room.id }, data: { ...(parsed.data.status ? { status: parsed.data.status } : {}), ...(parsed.data.cleaningStatus ? { cleaningStatus: parsed.data.cleaningStatus } : {}) } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'HotelRoom', entityId: nextRoom.id, changes: parsed.data as Prisma.InputJsonValue } });
    return nextRoom;
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') revalidatePath('/hotel');
  return { success: true, data: { id: updated.id } };
}

export async function updateHotelBooking(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(hotelRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const schema = z.object({ bookingId: z.string().trim().min(1), status: z.enum(['RESERVED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']).optional(), cancellationReason: z.string().trim().optional().or(z.literal('')), checkInDate: z.string().trim().optional().or(z.literal('')), checkOutDate: z.string().trim().optional().or(z.literal('')) });
  const parsed = await parseOrFail(schema, rawData);
  if (!parsed.success) return parsed;

  const booking = await db.hotelBooking.findUnique({ where: { id: parsed.data.bookingId }, select: { id: true, roomId: true, status: true } });
  if (!booking) return { success: false, error: 'Booking tidak ditemukan' };

  const nextStatus = parsed.data.status ?? booking.status;
  const data: Prisma.HotelBookingUpdateInput = {
    status: nextStatus,
    updatedBy: actor.id,
    ...(parsed.data.cancellationReason ? { notes: parsed.data.cancellationReason } : {}),
    ...(parsed.data.checkInDate ? { checkInDate: new Date(parsed.data.checkInDate) } : {}),
    ...(parsed.data.checkOutDate ? { checkOutDate: new Date(parsed.data.checkOutDate) } : {}),
  };

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.hotelBooking.update({ where: { id: booking.id }, data });
    if (nextStatus === 'CANCELLED') {
      await tx.hotelRoom.update({ where: { id: booking.roomId }, data: { status: 'AVAILABLE', cleaningStatus: 'CLEAN' } });
    }
    await tx.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'HotelBooking', entityId: booking.id, changes: parsed.data as Prisma.InputJsonValue } });
  });

  return { success: true, data: { id: booking.id } };
}

export async function checkHotelAvailability(rawData: unknown): Promise<ActionResult<{ availableRooms: number; roomTypeId?: string | null }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(hotelRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const schema = z.object({ roomTypeId: z.string().trim().optional().or(z.literal('')), checkInDate: z.string().trim().min(1), checkOutDate: z.string().trim().min(1) });
  const parsed = await parseOrFail(schema, rawData);
  if (!parsed.success) return parsed;

  const rooms = await db.hotelRoom.findMany({ where: { deletedAt: null, ...(parsed.data.roomTypeId ? { roomTypeId: parsed.data.roomTypeId } : {}), status: 'AVAILABLE', cleaningStatus: 'CLEAN' }, select: { id: true } });
  return { success: true, data: { availableRooms: rooms.length, roomTypeId: parsed.data.roomTypeId || null } };
}

export async function createHotelDailyLog(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(hotelRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const schema = z.object({ bookingId: z.string().trim().min(1), notes: z.string().trim().optional().or(z.literal('')), feeding: z.boolean().default(false), medication: z.boolean().default(false), walking: z.boolean().default(false), bath: z.boolean().default(false), play: z.boolean().default(false), weight: z.coerce.number().optional(), temperature: z.coerce.number().optional() });
  const parsed = await parseOrFail(schema, rawData);
  if (!parsed.success) return parsed;

  const log = await db.hotelDailyLog.create({ data: { bookingId: parsed.data.bookingId, notes: parsed.data.notes || null, feeding: parsed.data.feeding, medication: parsed.data.medication, walking: parsed.data.walking, bath: parsed.data.bath, play: parsed.data.play, weight: parsed.data.weight ? String(parsed.data.weight) : null, temperature: parsed.data.temperature ? String(parsed.data.temperature) : null, createdBy: actor.id } });
  await db.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'HotelDailyLog', entityId: log.id, changes: parsed.data as Prisma.InputJsonValue } });
  return { success: true, data: { id: log.id } };
}

export async function createHotelInventoryUsage(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(hotelRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const schema = z.object({ bookingId: z.string().trim().min(1), productId: z.string().trim().min(1), qty: z.coerce.number().int().min(1), notes: z.string().trim().optional().or(z.literal('')) });
  const parsed = await parseOrFail(schema, rawData);
  if (!parsed.success) return parsed;

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const product = await tx.product.findUnique({ where: { id: parsed.data.productId }, select: { id: true, currentQty: true, requiresBatch: true } });
    if (!product) throw new Error('Produk tidak ditemukan');
    if (product.currentQty < parsed.data.qty) throw new Error('Stok tidak mencukupi');

    if (product.requiresBatch) {
      const batches = await tx.inventoryBatch.findMany({ where: { productId: parsed.data.productId, deletedAt: null }, select: { id: true, currentQty: true } });
      if (!batches.length) throw new Error('Batch tidak tersedia');
      await tx.inventoryBatch.update({ where: { id: batches[0].id }, data: { currentQty: batches[0].currentQty - parsed.data.qty } });
    } else {
      await tx.product.update({ where: { id: parsed.data.productId }, data: { currentQty: { decrement: parsed.data.qty } } });
    }

    const usage = await tx.hotelInventoryUsage.create({ data: { bookingId: parsed.data.bookingId, productId: parsed.data.productId, qty: parsed.data.qty, notes: parsed.data.notes || null, createdBy: actor.id } });
    await tx.stockMovement.create({ data: { productId: parsed.data.productId, batchId: null, warehouseId: null, type: 'OUT', refType: 'SALES', refId: usage.id, qty: -parsed.data.qty, balanceAfter: Math.max(0, product.currentQty - parsed.data.qty), notes: parsed.data.notes || null, createdBy: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'HotelInventoryUsage', entityId: usage.id, changes: parsed.data as Prisma.InputJsonValue } });
    return usage;
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') revalidatePath('/hotel');
  return { success: true, data: { id: result.id } };
}

export async function getHotelDashboardSummary() {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(hotelRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const [bookings, rooms] = await Promise.all([
    db.hotelBooking.findMany({ where: { deletedAt: null }, select: { status: true } }),
    db.hotelRoom.findMany({ where: { deletedAt: null }, select: { status: true, cleaningStatus: true } }),
  ]);

  const currentGuests = bookings.filter((booking) => booking.status === 'CHECKED_IN').length;
  const availableRooms = rooms.filter((room) => room.status === 'AVAILABLE').length;
  const cleaningQueue = rooms.filter((room) => room.cleaningStatus === 'DIRTY').length;
  return { success: true, data: { currentGuests, availableRooms, cleaningQueue, totalBookings: bookings.length } };
}

export async function getHotelReportingData() {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(hotelRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const bookings = await db.hotelBooking.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      bookingNo: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      checkInDate: true,
      checkOutDate: true,
      customer: { select: { id: true, name: true } },
      room: { select: { id: true, roomNo: true } },
    },
  });

  const rooms = await db.hotelRoom.findMany({ where: { deletedAt: null }, select: { id: true, roomNo: true, status: true, cleaningStatus: true } });
  return { success: true, data: { bookings, rooms } };
}

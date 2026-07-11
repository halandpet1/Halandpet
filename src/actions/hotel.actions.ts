'use server';

import type { Prisma, PaymentMethod, UserRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { parseOrFail, type ActionResult } from '@/lib/action-utils';
import { createHotelBookingSchema, hotelAssignRoomSchema, hotelAvailabilitySchema, hotelBookingUpdateSchema, hotelCheckInSchema, hotelCheckOutSchema, hotelDailyLogSchema, hotelInventoryUsageSchema, hotelRescheduleSchema, hotelRoomSchema, hotelRoomStatusSchema, hotelStayExtensionSchema } from '@/validators/hotel.schema';
import { allocateFefoBatches } from '@/lib/inventory-utils';

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

async function createInvoiceNumber(tx: Prisma.TransactionClient) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const sequenceClient = (tx as Prisma.TransactionClient & { invoiceSequence?: { findUnique: (args: { where: { yearMonth: string } }) => Promise<{ nextNumber: number } | null>; upsert: (args: { where: { yearMonth: string }; update: { nextNumber: number }; create: { yearMonth: string; nextNumber: number } }) => Promise<unknown> } }).invoiceSequence;

  if (sequenceClient?.findUnique && sequenceClient?.upsert) {
    const sequence = await sequenceClient.findUnique({ where: { yearMonth } });
    const nextNumber = sequence ? sequence.nextNumber : 1;
    const invoiceNo = `INV-${yearMonth}-${String(nextNumber).padStart(5, '0')}`;

    await sequenceClient.upsert({
      where: { yearMonth },
      update: { nextNumber: nextNumber + 1 },
      create: { yearMonth, nextNumber: nextNumber + 1 },
    });

    return invoiceNo;
  }

  const counter = (globalThis as typeof globalThis & { __invoiceSequenceCounter?: number }).__invoiceSequenceCounter ?? 1;
  (globalThis as typeof globalThis & { __invoiceSequenceCounter?: number }).__invoiceSequenceCounter = counter + 1;
  return `INV-${yearMonth}-${String(counter).padStart(5, '0')}`;
}

export async function createHotelBooking(rawData: unknown): Promise<ActionResult<{ id: string; bookingNo: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(hotelRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(createHotelBookingSchema, rawData);
  if (!parsed.success) return parsed;

  const customer = await db.customer.findUnique({ where: { id: parsed.data.customerId }, select: { id: true } });
  const pet = await db.pet.findUnique({ where: { id: parsed.data.petId }, select: { id: true } });
  if (!customer || !pet) return { success: false, error: 'Customer atau hewan tidak ditemukan' };

  const availableRooms = await db.hotelRoom.findMany({
    where: { deletedAt: null, roomTypeId: parsed.data.roomTypeId, status: 'AVAILABLE', cleaningStatus: 'CLEAN' },
    select: { id: true, roomNo: true, capacity: true, status: true, cleaningStatus: true, ratePerNight: true },
  });

  const checkIn = new Date(parsed.data.checkInDate);
  const checkOut = new Date(parsed.data.checkOutDate);
  const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));

  const booking = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.hotelBooking.create({
      data: {
        bookingNo: createBookingNumber(),
        customerId: parsed.data.customerId,
        petId: parsed.data.petId,
        roomId: availableRooms[0]?.id ?? null,
        roomTypeId: parsed.data.roomTypeId,
        bookingType: parsed.data.bookingType,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        status: availableRooms[0] ? 'RESERVED' : 'WAITING_LIST',
        totalAmount: availableRooms[0] ? Number(availableRooms[0].ratePerNight) * nights : 0,
        roomCharge: availableRooms[0] ? Number(availableRooms[0].ratePerNight) * nights : 0,
        notes: parsed.data.notes || null,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });

    if (availableRooms[0]) {
      await tx.hotelRoom.update({ where: { id: availableRooms[0].id }, data: { status: 'RESERVED' } });
    }
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

  const parsed = await parseOrFail(hotelCheckInSchema, rawData);
  if (!parsed.success) return parsed;

  const booking = await db.hotelBooking.findUnique({ where: { id: parsed.data.bookingId }, select: { id: true, status: true, roomId: true } });
  if (!booking) return { success: false, error: 'Booking tidak ditemukan' };
  if (booking.status !== 'RESERVED') return { success: false, error: 'Booking tidak dapat check in' };
  if (!booking.roomId) return { success: false, error: 'Kamar belum ditugaskan' };

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.hotelBooking.update({ where: { id: booking.id }, data: { status: 'CHECKED_IN', checkedInAt: new Date(), updatedBy: actor.id } });
    await tx.hotelRoom.update({ where: { id: booking.roomId! }, data: { status: 'OCCUPIED', cleaningStatus: 'USED' } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CHECK_IN', entity: 'HotelBooking', entityId: booking.id, changes: { bookingId: booking.id } as Prisma.InputJsonValue } });
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') revalidatePath('/hotel');
  return { success: true, data: { id: booking.id } };
}

export async function checkOutHotelBooking(rawData: unknown): Promise<ActionResult<{ id: string; invoiceId: string | null }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(['OWNER', 'ADMIN', 'CASHIER']);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(hotelCheckOutSchema, rawData);
  if (!parsed.success) return parsed;

  const booking = await db.hotelBooking.findUnique({ where: { id: parsed.data.bookingId }, select: { id: true, status: true, roomId: true, customerId: true, totalAmount: true, roomCharge: true, foodCharge: true, medicationCharge: true, groomingCharge: true, additionalServiceCharge: true, damageFee: true, lateCheckoutFee: true } });
  if (!booking) return { success: false, error: 'Booking tidak ditemukan' };
  if (booking.status !== 'CHECKED_IN') return { success: false, error: 'Booking belum check in' };
  if (!booking.roomId) return { success: false, error: 'Kamar belum ditugaskan' };

  const invoiceTotal = Number(booking.totalAmount ?? 0) + Number(booking.roomCharge ?? 0) + Number(booking.foodCharge ?? 0) + Number(booking.medicationCharge ?? 0) + Number(booking.groomingCharge ?? 0) + Number(booking.additionalServiceCharge ?? 0) + Number(booking.damageFee ?? 0) + Number(booking.lateCheckoutFee ?? 0);

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const invoice = await tx.invoice.create({
      data: {
        invoiceNo: await createInvoiceNumber(tx),
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
    await tx.hotelRoom.update({ where: { id: booking.roomId! }, data: { status: 'AVAILABLE', cleaningStatus: 'CLEAN' } });
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

  const parsed = await parseOrFail(hotelRoomSchema, rawData);
  if (!parsed.success) return parsed;

  const room = await db.hotelRoom.create({ data: { roomNo: parsed.data.roomNo, name: parsed.data.name, type: parsed.data.type, roomTypeId: parsed.data.roomTypeId || null, ratePerNight: parsed.data.ratePerNight, capacity: parsed.data.capacity, status: parsed.data.status, cleaningStatus: parsed.data.cleaningStatus, isActive: true } });
  await db.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'HotelRoom', entityId: room.id, changes: parsed.data as Prisma.InputJsonValue } });
  return { success: true, data: { id: room.id } };
}

export async function updateHotelRoomStatus(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(['OWNER', 'ADMIN']);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(hotelRoomStatusSchema, rawData);
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

  const parsed = await parseOrFail(hotelBookingUpdateSchema, rawData);
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
    if (nextStatus === 'CANCELLED' && booking.roomId) {
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

  const parsed = await parseOrFail(hotelAvailabilitySchema, rawData);
  if (!parsed.success) return parsed;

  const rooms = await db.hotelRoom.findMany({ where: { deletedAt: null, ...(parsed.data.roomTypeId ? { roomTypeId: parsed.data.roomTypeId } : {}), status: 'AVAILABLE', cleaningStatus: 'CLEAN' }, select: { id: true } });
  return { success: true, data: { availableRooms: rooms.length, roomTypeId: parsed.data.roomTypeId || null } };
}

export async function createHotelDailyLog(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(hotelRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(hotelDailyLogSchema, rawData);
  if (!parsed.success) return parsed;

  const booking = await db.hotelBooking.findUnique({ where: { id: parsed.data.bookingId }, select: { id: true, status: true } });
  if (!booking) return { success: false, error: 'Booking tidak ditemukan' };
  if (booking.status !== 'CHECKED_IN') return { success: false, error: 'Booking belum check in' };

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const log = await tx.hotelDailyLog.create({
      data: {
        bookingId: parsed.data.bookingId,
        notes: parsed.data.notes || null,
        feeding: parsed.data.feeding,
        medication: parsed.data.medication,
        walking: parsed.data.walking,
        bath: parsed.data.bath,
        play: parsed.data.play,
        weight: parsed.data.weight ? String(parsed.data.weight) : null,
        temperature: parsed.data.temperature ? String(parsed.data.temperature) : null,
        createdBy: actor.id,
      },
    });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'HotelDailyLog', entityId: log.id, changes: parsed.data as Prisma.InputJsonValue } });
    return log;
  });

  return { success: true, data: { id: result.id } };
}

export async function createHotelInventoryUsage(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(hotelRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(hotelInventoryUsageSchema, rawData);
  if (!parsed.success) return parsed;

  try {
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const product = await tx.product.findUnique({ where: { id: parsed.data.productId }, select: { id: true, currentQty: true, requiresBatch: true } });
      if (!product) throw new Error('Produk tidak ditemukan');
      if (product.currentQty < parsed.data.qty) throw new Error('Stok tidak mencukupi');

      let nextBalance = product.currentQty;
      if (product.requiresBatch) {
        const batches = await tx.inventoryBatch.findMany({ where: { productId: parsed.data.productId, deletedAt: null, currentQty: { gt: 0 } }, select: { id: true, currentQty: true, expiryDate: true } });
        const allocations = allocateFefoBatches(batches, parsed.data.qty);
        if (!allocations.length) throw new Error('Batch tidak tersedia');

        for (const allocation of allocations) {
          const batch = batches.find((candidate) => candidate.id === allocation.id);
          if (!batch) continue;
          const updatedBatch = await tx.inventoryBatch.update({ where: { id: batch.id }, data: { currentQty: batch.currentQty - allocation.qty, updatedAt: new Date() } });
          nextBalance = Math.max(0, updatedBatch.currentQty);
          await tx.stockMovement.create({ data: { productId: parsed.data.productId, batchId: batch.id, warehouseId: null, type: 'OUT', refType: 'SALES', refId: parsed.data.bookingId, qty: -allocation.qty, balanceAfter: nextBalance, notes: parsed.data.notes || null, createdBy: actor.id } });
        }

        await tx.product.update({ where: { id: parsed.data.productId }, data: { currentQty: { decrement: parsed.data.qty }, updatedAt: new Date() } });
      } else {
        const updatedProduct = await tx.product.update({ where: { id: parsed.data.productId }, data: { currentQty: { decrement: parsed.data.qty }, updatedAt: new Date() } });
        nextBalance = updatedProduct.currentQty ?? Math.max(0, product.currentQty - parsed.data.qty);
        await tx.stockMovement.create({ data: { productId: parsed.data.productId, batchId: null, warehouseId: null, type: 'OUT', refType: 'SALES', refId: parsed.data.bookingId, qty: -parsed.data.qty, balanceAfter: Math.max(0, nextBalance), notes: parsed.data.notes || null, createdBy: actor.id } });
      }

      const usage = await tx.hotelInventoryUsage.create({ data: { bookingId: parsed.data.bookingId, productId: parsed.data.productId, qty: parsed.data.qty, notes: parsed.data.notes || null, createdBy: actor.id } });
      await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'HotelInventoryUsage', entityId: usage.id, changes: parsed.data as Prisma.InputJsonValue } });
      return usage;
    });

    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') revalidatePath('/hotel');
    return { success: true, data: { id: result.id } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal membuat penggunaan inventaris hotel' };
  }
}

export async function assignHotelBookingRoom(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(hotelRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(hotelAssignRoomSchema, rawData);
  if (!parsed.success) return parsed;

  const booking = await db.hotelBooking.findUnique({ where: { id: parsed.data.bookingId }, select: { id: true, roomId: true, status: true } });
  if (!booking) return { success: false, error: 'Booking tidak ditemukan' };

  const room = await db.hotelRoom.findUnique({ where: { id: parsed.data.roomId }, select: { id: true, status: true, cleaningStatus: true } });
  if (!room) return { success: false, error: 'Kamar tidak ditemukan' };
  if (room.status !== 'AVAILABLE' || room.cleaningStatus !== 'CLEAN') return { success: false, error: 'Kamar tidak tersedia' };

  const updated = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const nextBooking = await tx.hotelBooking.update({ where: { id: booking.id }, data: { roomId: room.id, status: 'RESERVED', updatedBy: actor.id } });
    await tx.hotelRoom.update({ where: { id: room.id }, data: { status: 'RESERVED' } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'ASSIGN_ROOM', entity: 'HotelBooking', entityId: nextBooking.id, changes: { roomId: room.id } as Prisma.InputJsonValue } });
    return nextBooking;
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') revalidatePath('/hotel');
  return { success: true, data: { id: updated.id } };
}

export async function rescheduleHotelBooking(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(hotelRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(hotelRescheduleSchema, rawData);
  if (!parsed.success) return parsed;

  const booking = await db.hotelBooking.findUnique({ where: { id: parsed.data.bookingId }, select: { id: true } });
  if (!booking) return { success: false, error: 'Booking tidak ditemukan' };

  const updated = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const nextBooking = await tx.hotelBooking.update({ where: { id: booking.id }, data: { checkInDate: new Date(parsed.data.checkInDate), checkOutDate: new Date(parsed.data.checkOutDate), updatedBy: actor.id, notes: parsed.data.notes || undefined } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'RESCHEDULE', entity: 'HotelBooking', entityId: nextBooking.id, changes: parsed.data as Prisma.InputJsonValue } });
    return nextBooking;
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') revalidatePath('/hotel');
  return { success: true, data: { id: updated.id } };
}

export async function extendHotelBookingStay(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(hotelRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(hotelStayExtensionSchema, rawData);
  if (!parsed.success) return parsed;

  const booking = await db.hotelBooking.findUnique({ where: { id: parsed.data.bookingId }, select: { id: true, checkOutDate: true, totalAmount: true, roomCharge: true } });
  if (!booking) return { success: false, error: 'Booking tidak ditemukan' };

  const previousCheckout = booking.checkOutDate instanceof Date ? booking.checkOutDate : new Date(booking.checkOutDate);
  const nextCheckout = new Date(previousCheckout);
  nextCheckout.setDate(nextCheckout.getDate() + parsed.data.additionalNights);

  const updated = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const nextBooking = await tx.hotelBooking.update({ where: { id: booking.id }, data: { checkOutDate: nextCheckout, totalAmount: Number(booking.totalAmount ?? 0) + Number(booking.roomCharge ?? 0) * parsed.data.additionalNights, roomCharge: Number(booking.roomCharge ?? 0) + Number(booking.roomCharge ?? 0) * parsed.data.additionalNights, updatedBy: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'EXTEND_STAY', entity: 'HotelBooking', entityId: nextBooking.id, changes: { additionalNights: parsed.data.additionalNights } as Prisma.InputJsonValue } });
    return nextBooking;
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') revalidatePath('/hotel');
  return { success: true, data: { id: updated.id } };
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

import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  customer: { findUnique: vi.fn() },
  pet: { findUnique: vi.fn() },
  hotelRoom: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  hotelBooking: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
  hotelDailyLog: { create: vi.fn(), findMany: vi.fn() },
  hotelInventoryUsage: { create: vi.fn(), findMany: vi.fn() },
  invoice: { create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  invoiceItem: { create: vi.fn() },
  payment: { create: vi.fn() },
  product: { findUnique: vi.fn(), update: vi.fn() },
  inventoryBatch: { findMany: vi.fn(), update: vi.fn() },
  stockMovement: { create: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

const getSessionUserMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/session', () => ({ getSessionUser: getSessionUserMock }));

import { assignHotelBookingRoom, checkHotelAvailability, checkInHotelBooking, checkOutHotelBooking, createHotelBooking, createHotelDailyLog, createHotelInventoryUsage, createHotelRoom, extendHotelBookingStay, getHotelDashboardSummary, getHotelReportingData, rescheduleHotelBooking, updateHotelBooking, updateHotelRoomStatus } from './hotel.actions';

describe('hotel actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.$transaction.mockImplementation(async (callback: (tx: typeof dbMock) => Promise<unknown>) => callback(dbMock));
  });

  it('creates a hotel booking when a room is available', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-1', role: 'STAFF', fullName: 'Staff' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'STAFF', isActive: true, deletedAt: null });
    dbMock.customer.findUnique.mockResolvedValue({ id: 'cust-1', name: 'Budi' });
    dbMock.pet.findUnique.mockResolvedValue({ id: 'pet-1', name: 'Milo' });
    dbMock.hotelRoom.findMany.mockResolvedValue([{ id: 'room-1', roomNo: '101', roomTypeId: 'type-1', capacity: 1, status: 'AVAILABLE', cleaningStatus: 'CLEAN', ratePerNight: 150000 }]);
    dbMock.hotelBooking.findMany.mockResolvedValue([]);
    dbMock.hotelBooking.create.mockResolvedValue({ id: 'booking-1', bookingNo: 'HTL-001', status: 'RESERVED' });

    const result = await createHotelBooking({ customerId: 'cust-1', petId: 'pet-1', roomTypeId: 'type-1', bookingType: 'BOARDING', checkInDate: '2026-07-10', checkOutDate: '2026-07-12' });

    expect(result.success).toBe(true);
    expect(dbMock.hotelBooking.create).toHaveBeenCalled();
  });

  it('checks in a booking and updates status', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-2', role: 'STAFF', fullName: 'Staff' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-2', role: 'STAFF', isActive: true, deletedAt: null });
    dbMock.hotelBooking.findUnique.mockResolvedValue({ id: 'booking-2', status: 'RESERVED', roomId: 'room-1', customerId: 'cust-1', petId: 'pet-1' });
    dbMock.hotelBooking.update.mockResolvedValue({ id: 'booking-2', status: 'CHECKED_IN' });
    dbMock.hotelRoom.update.mockResolvedValue({ id: 'room-1', status: 'OCCUPIED' });

    const result = await checkInHotelBooking({ bookingId: 'booking-2' });

    expect(result.success).toBe(true);
    expect(dbMock.hotelBooking.update).toHaveBeenCalled();
  });

  it('checks out a booking and creates an invoice', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-3', role: 'CASHIER', fullName: 'Cashier' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-3', role: 'CASHIER', isActive: true, deletedAt: null });
    dbMock.hotelBooking.findUnique.mockResolvedValue({ id: 'booking-3', status: 'CHECKED_IN', roomId: 'room-1', customerId: 'cust-1', roomCharge: 300000, foodCharge: 50000, medicationCharge: 25000, groomingCharge: 0, additionalServiceCharge: 0, damageFee: 0, lateCheckoutFee: 0, totalAmount: 375000, petId: 'pet-1' });
    dbMock.hotelBooking.update.mockResolvedValue({ id: 'booking-3', status: 'CHECKED_OUT' });
    dbMock.hotelRoom.update.mockResolvedValue({ id: 'room-1', status: 'AVAILABLE' });
    dbMock.invoice.create.mockResolvedValue({ id: 'invoice-1', invoiceNo: 'INV-202607-00001' });
    dbMock.payment.create.mockResolvedValue({ id: 'payment-1' });

    const result = await checkOutHotelBooking({ bookingId: 'booking-3', paymentMethod: 'CASH', amountPaid: 375000 });

    expect(result.success).toBe(true);
    expect(dbMock.invoice.create).toHaveBeenCalled();
  });

  it('records daily care activity for a booking', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-4', role: 'STAFF', fullName: 'Staff' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-4', role: 'STAFF', isActive: true, deletedAt: null });
    dbMock.hotelBooking.findUnique.mockResolvedValue({ id: 'booking-4', status: 'CHECKED_IN' });
    dbMock.hotelDailyLog.create.mockResolvedValue({ id: 'log-1' });

    const result = await createHotelDailyLog({ bookingId: 'booking-4', notes: 'Good appetite', feeding: true, medication: false, walking: true, bath: false, play: true, weight: 4.2, temperature: 38.2 });

    expect(result.success).toBe(true);
    expect(dbMock.hotelDailyLog.create).toHaveBeenCalled();
  });

  it('rejects a daily care log for a non-existent booking', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-4b', role: 'STAFF', fullName: 'Staff' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-4b', role: 'STAFF', isActive: true, deletedAt: null });
    dbMock.hotelBooking.findUnique.mockResolvedValue(null);

    const result = await createHotelDailyLog({ bookingId: 'missing-booking', notes: 'No booking', feeding: true });

    expect(result.success).toBe(false);
    expect(result).toMatchObject({ success: false, error: expect.stringContaining('Booking tidak ditemukan') });
  });

  it('deducts inventory usage for hotel services', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-5', role: 'STAFF', fullName: 'Staff' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-5', role: 'STAFF', isActive: true, deletedAt: null });
    dbMock.product.findUnique.mockResolvedValue({ id: 'product-1', currentQty: 10, requiresBatch: false });
    dbMock.product.update.mockResolvedValue({ id: 'product-1', currentQty: 8 });
    dbMock.hotelInventoryUsage.create.mockResolvedValue({ id: 'usage-1' });
    dbMock.stockMovement.create.mockResolvedValue({ id: 'sm-1' });

    const result = await createHotelInventoryUsage({ bookingId: 'booking-5', productId: 'product-1', qty: 2, notes: 'Food usage' });

    expect(result.success).toBe(true);
    expect(dbMock.stockMovement.create).toHaveBeenCalled();
  });

  it('rejects hotel inventory usage when a product does not exist', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-5b', role: 'STAFF', fullName: 'Staff' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-5b', role: 'STAFF', isActive: true, deletedAt: null });
    dbMock.product.findUnique.mockResolvedValue(null);

    const result = await createHotelInventoryUsage({ bookingId: 'booking-5', productId: 'missing-product', qty: 2, notes: 'Food usage' });

    expect(result.success).toBe(false);
    expect(result).toMatchObject({ success: false, error: expect.stringContaining('Produk tidak ditemukan') });
  });

  it('creates a hotel room and checks availability', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-6', role: 'OWNER', fullName: 'Owner' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-6', role: 'OWNER', isActive: true, deletedAt: null });
    dbMock.hotelRoom.create.mockResolvedValue({ id: 'room-2', roomNo: '102' });
    dbMock.hotelRoom.findMany.mockResolvedValue([{ id: 'room-1', roomNo: '101', status: 'AVAILABLE', cleaningStatus: 'CLEAN' }, { id: 'room-2', roomNo: '102', status: 'AVAILABLE', cleaningStatus: 'CLEAN' }]);

    const roomResult = await createHotelRoom({ roomNo: '102', name: 'Deluxe', type: 'DELUXE', ratePerNight: 180000, capacity: 2, roomTypeId: 'type-2' });
    const availabilityResult = await checkHotelAvailability({ roomTypeId: 'type-2', checkInDate: '2026-07-10', checkOutDate: '2026-07-12' });

    expect(roomResult.success).toBe(true);
    expect(availabilityResult.success).toBe(true);
    if (availabilityResult.success) {
      expect(availabilityResult.data.availableRooms).toBeGreaterThan(0);
    }
  });

  it('creates a waiting-list booking when no room is available', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-7', role: 'STAFF', fullName: 'Staff' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-7', role: 'STAFF', isActive: true, deletedAt: null });
    dbMock.customer.findUnique.mockResolvedValue({ id: 'cust-1', name: 'Budi' });
    dbMock.pet.findUnique.mockResolvedValue({ id: 'pet-1', name: 'Milo' });
    dbMock.hotelRoom.findMany.mockResolvedValue([]);
    dbMock.hotelBooking.create.mockResolvedValue({ id: 'booking-wl', bookingNo: 'HTL-WL', status: 'WAITING_LIST' });

    const result = await createHotelBooking({ customerId: 'cust-1', petId: 'pet-1', roomTypeId: 'type-1', bookingType: 'BOARDING', checkInDate: '2026-07-10', checkOutDate: '2026-07-12' });

    expect(result.success).toBe(true);
    expect(dbMock.hotelBooking.create).toHaveBeenCalled();
  });

  it('assigns a room to a waiting-list booking', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-8', role: 'STAFF', fullName: 'Staff' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-8', role: 'STAFF', isActive: true, deletedAt: null });
    dbMock.hotelBooking.findUnique.mockResolvedValue({ id: 'booking-7', status: 'WAITING_LIST', roomId: 'room-1' });
    dbMock.hotelRoom.findUnique.mockResolvedValue({ id: 'room-2', status: 'AVAILABLE', cleaningStatus: 'CLEAN' });
    dbMock.hotelBooking.update.mockResolvedValue({ id: 'booking-7', status: 'RESERVED' });

    const result = await assignHotelBookingRoom({ bookingId: 'booking-7', roomId: 'room-2' });

    expect(result.success).toBe(true);
    expect(dbMock.hotelBooking.update).toHaveBeenCalled();
  });

  it('reschedules a booking and extends the stay', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-9', role: 'STAFF', fullName: 'Staff' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-9', role: 'STAFF', isActive: true, deletedAt: null });
    dbMock.hotelBooking.findUnique.mockResolvedValue({ id: 'booking-8', status: 'RESERVED', roomId: 'room-1' });
    dbMock.hotelBooking.update.mockResolvedValue({ id: 'booking-8', status: 'RESERVED' });

    const rescheduleResult = await rescheduleHotelBooking({ bookingId: 'booking-8', checkInDate: '2026-07-11', checkOutDate: '2026-07-14' });
    const extendResult = await extendHotelBookingStay({ bookingId: 'booking-8', additionalNights: 2 });

    expect(rescheduleResult.success).toBe(true);
    expect(extendResult.success).toBe(true);
    expect(dbMock.hotelBooking.update).toHaveBeenCalled();
  });

  it('updates a booking to cancel', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-10', role: 'STAFF', fullName: 'Staff' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-10', role: 'STAFF', isActive: true, deletedAt: null });
    dbMock.hotelBooking.findUnique.mockResolvedValue({ id: 'booking-9', status: 'RESERVED', roomId: 'room-1' });
    dbMock.hotelBooking.update.mockResolvedValue({ id: 'booking-9', status: 'CANCELLED' });

    const result = await updateHotelBooking({ bookingId: 'booking-9', status: 'CANCELLED', cancellationReason: 'Customer request' });

    expect(result.success).toBe(true);
    expect(dbMock.hotelBooking.update).toHaveBeenCalled();
  });

  it('marks a room as dirty or maintenance from the hotel panel', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-8', role: 'OWNER', fullName: 'Owner' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-8', role: 'OWNER', isActive: true, deletedAt: null });
    dbMock.hotelRoom.findUnique.mockResolvedValue({ id: 'room-3', status: 'AVAILABLE', cleaningStatus: 'CLEAN' });
    dbMock.hotelRoom.update.mockResolvedValue({ id: 'room-3', status: 'MAINTENANCE', cleaningStatus: 'DIRTY' });

    const result = await updateHotelRoomStatus({ roomId: 'room-3', status: 'MAINTENANCE', cleaningStatus: 'DIRTY' });

    expect(result.success).toBe(true);
    expect(dbMock.hotelRoom.update).toHaveBeenCalled();
  });

  it('returns hotel dashboard summary values', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-8', role: 'OWNER', fullName: 'Owner' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-8', role: 'OWNER', isActive: true, deletedAt: null });
    dbMock.hotelBooking.findMany.mockResolvedValue([{ id: 'b-1', status: 'CHECKED_IN' }, { id: 'b-2', status: 'RESERVED' }]);
    dbMock.hotelRoom.findMany.mockResolvedValue([{ id: 'r-1', status: 'AVAILABLE' }, { id: 'r-2', status: 'OCCUPIED' }]);

    const result = await getHotelDashboardSummary();

    expect(result.success).toBe(true);
    expect(result.data?.currentGuests).toBe(1);
  });

  it('returns hotel reporting data for occupancy and revenue', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-7', role: 'OWNER', fullName: 'Owner' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-7', role: 'OWNER', isActive: true, deletedAt: null });
    dbMock.hotelBooking.findMany.mockResolvedValue([{ id: 'b-1', bookingNo: 'HTL-001', status: 'CHECKED_IN', totalAmount: 400000, checkInDate: new Date(), checkOutDate: new Date(), customer: { id: 'cust-1', name: 'Budi' }, room: { id: 'r-1', roomNo: '101' } }]);
    dbMock.hotelRoom.findMany.mockResolvedValue([{ id: 'r-1', status: 'OCCUPIED' }, { id: 'r-2', status: 'AVAILABLE' }]);

    const result = await getHotelReportingData();

    expect(result.success).toBe(true);
    expect(result.data?.bookings).toHaveLength(1);
  });
});

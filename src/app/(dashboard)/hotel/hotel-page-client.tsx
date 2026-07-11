'use client';

import { useEffect, useMemo, useState } from 'react';
import { assignHotelBookingRoom, checkInHotelBooking, checkOutHotelBooking, createHotelBooking, createHotelDailyLog, extendHotelBookingStay, getHotelDashboardSummary, getHotelReportingData, listHotelRoomTypes, rescheduleHotelBooking, updateHotelRoomStatus } from '@/actions/hotel.actions';
import { listCustomers, listPets } from '@/actions/customer.actions';

type CustomerOption = { id: string; name: string };
type PetOption = { id: string; name: string; customerId: string };
type HotelRoomTypeOption = { id: string; name: string };

type HotelRoom = { id: string; roomNo: string; status: string; cleaningStatus: string };

export function HotelPageClient() {
  const [bookings, setBookings] = useState<Array<{ id: string; bookingNo: string; status: string; totalAmount: number | null; customerName: string; roomNo: string }>>([]);
  const [dashboard, setDashboard] = useState<{ currentGuests: number; availableRooms: number; cleaningQueue: number; totalBookings: number } | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [pets, setPets] = useState<PetOption[]>([]);
  const [roomTypes, setRoomTypes] = useState<HotelRoomTypeOption[]>([]);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [message, setMessage] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [petId, setPetId] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [bookingType, setBookingType] = useState('BOARDING');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [notes, setNotes] = useState('');
  const [roomId, setRoomId] = useState('');
  const [assignedRoomId, setAssignedRoomId] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [rescheduleCheckIn, setRescheduleCheckIn] = useState('');
  const [rescheduleCheckOut, setRescheduleCheckOut] = useState('');
  const [extensionNights, setExtensionNights] = useState('1');
  const [roomStatus, setRoomStatus] = useState('MAINTENANCE');
  const [cleaningStatus, setCleaningStatus] = useState('DIRTY');

  async function loadHotelData() {
    const [summary, report, customerResult, petResult, roomTypeResult] = await Promise.all([
      getHotelDashboardSummary(),
      getHotelReportingData(),
      listCustomers({ page: 1, pageSize: 200 }),
      listPets({ page: 1, pageSize: 200 }),
      listHotelRoomTypes(),
    ]);

    if (summary.success) setDashboard(summary.data ?? null);
    if (report.success) {
      setBookings((report.data?.bookings ?? []).map((item) => ({ id: item.id, bookingNo: item.bookingNo, status: item.status, totalAmount: Number(item.totalAmount ?? 0), customerName: item.customer?.name ?? 'Walk-In', roomNo: item.room?.roomNo ?? '-' })));
      setRooms(report.data?.rooms ?? []);
    }
    if (customerResult.success) setCustomers((customerResult.data?.items ?? []) as CustomerOption[]);
    if (petResult.success) setPets((petResult.data?.items ?? []) as PetOption[]);
    if (roomTypeResult.success) setRoomTypes(roomTypeResult.data ?? []);
  }

  useEffect(() => {
    async function fetchData() {
      await loadHotelData();
    }
    void fetchData();
  }, []);

  const totalRevenue = useMemo(() => bookings.reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0), [bookings]);

  async function handleCreateBooking(event: React.FormEvent) {
    event.preventDefault();
    const result = await createHotelBooking({ customerId, petId, roomTypeId, bookingType, checkInDate, checkOutDate, notes });
    if (result.success) {
      setMessage(`Booking dibuat: ${result.data?.bookingNo}`);
      setCustomerId('');
      setPetId('');
      setRoomTypeId('');
      setBookingType('BOARDING');
      setCheckInDate('');
      setCheckOutDate('');
      setNotes('');
      await loadHotelData();
    } else {
      setMessage(result.error ?? 'Gagal membuat booking');
    }
  }

  async function handleCheckIn(bookingId: string) {
    const result = await checkInHotelBooking({ bookingId });
    setMessage(result.success ? 'Check in berhasil' : result.error ?? 'Gagal check in');
  }

  async function handleCheckOut(bookingId: string) {
    const result = await checkOutHotelBooking({ bookingId, paymentMethod: 'CASH', amountPaid: 0 });
    setMessage(result.success ? 'Check out berhasil' : result.error ?? 'Gagal check out');
  }

  async function handleDailyCare(bookingId: string) {
    const result = await createHotelDailyLog({ bookingId, notes: 'Daily care logged', feeding: true, medication: false, walking: true, bath: false, play: true });
    setMessage(result.success ? 'Daily care tercatat' : result.error ?? 'Gagal mencatat daily care');
  }

  async function handleRoomStatusUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (!roomId) {
      setMessage('Pilih kamar terlebih dahulu');
      return;
    }
    const result = await updateHotelRoomStatus({ roomId, status: roomStatus as 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'MAINTENANCE' | 'OUT_OF_SERVICE', cleaningStatus: cleaningStatus as 'CLEAN' | 'DIRTY' | 'IN_PROGRESS' });
    setMessage(result.success ? 'Status kamar diperbarui' : result.error ?? 'Gagal memperbarui status kamar');
    if (result.success) await loadHotelData();
  }

  async function handleAssignRoom(event: React.FormEvent) {
    event.preventDefault();
    const result = await assignHotelBookingRoom({ bookingId: selectedBookingId, roomId: assignedRoomId });
    setMessage(result.success ? 'Room assignment berhasil' : result.error ?? 'Gagal assign room');
  }

  async function handleReschedule(event: React.FormEvent) {
    event.preventDefault();
    const result = await rescheduleHotelBooking({ bookingId: selectedBookingId, checkInDate: rescheduleCheckIn, checkOutDate: rescheduleCheckOut, notes: 'Rescheduled from hotel dashboard' });
    setMessage(result.success ? 'Booking berhasil direschedule' : result.error ?? 'Gagal reschedule booking');
  }

  async function handleExtendStay(event: React.FormEvent) {
    event.preventDefault();
    const result = await extendHotelBookingStay({ bookingId: selectedBookingId, additionalNights: Number(extensionNights || 1) });
    setMessage(result.success ? 'Stay berhasil diperpanjang' : result.error ?? 'Gagal memperpanjang stay');
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Pet Hotel</p>
        <h1 className="text-3xl font-semibold">Hotel Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Current Guests</p>
          <p className="mt-2 text-2xl font-semibold">{dashboard?.currentGuests ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Expected Check In</p>
          <p className="mt-2 text-2xl font-semibold">{bookings.filter((item) => item.status === 'RESERVED').length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Cleaning Queue</p>
          <p className="mt-2 text-2xl font-semibold">{dashboard?.cleaningQueue ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Revenue</p>
          <p className="mt-2 text-2xl font-semibold">Rp {totalRevenue}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={handleCreateBooking} className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Buat Booking</h2>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="mb-2 block">Customer</span>
              <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
                <option value="">Pilih customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Hewan</span>
              <select value={petId} onChange={(event) => setPetId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
                <option value="">Pilih hewan</option>
                {pets.filter((pet) => pet.customerId === customerId).map((pet) => (
                  <option key={pet.id} value={pet.id}>{pet.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Tipe kamar</span>
              <select value={roomTypeId} onChange={(event) => setRoomTypeId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
                <option value="">Pilih tipe kamar</option>
                {roomTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </label>
            <select value={bookingType} onChange={(event) => setBookingType(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
              <option value="BOARDING">Boarding</option>
              <option value="GROOMING">Grooming</option>
              <option value="DAYCARE">Daycare</option>
              <option value="HOTEL">Hotel</option>
            </select>
            <input type="date" value={checkInDate} onChange={(event) => setCheckInDate(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            <input type="date" value={checkOutDate} onChange={(event) => setCheckOutDate(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Catatan" className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </div>
          <button type="submit" className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold">Simpan Booking</button>
        </form>

        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Booking Terbaru</h2>
          <div className="mt-4 space-y-3">
            {bookings.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 bg-slate-950 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.bookingNo}</p>
                    <p className="text-sm text-slate-400">{item.customerName} • {item.roomNo}</p>
                  </div>
                  <p className="text-sm text-emerald-400">{item.status}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => { setSelectedBookingId(item.id); setAssignedRoomId(''); }} className="rounded-lg bg-slate-800 px-3 py-2 text-sm">Select</button>
                  <button type="button" onClick={() => void handleCheckIn(item.id)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm">Check In</button>
                  <button type="button" onClick={() => void handleCheckOut(item.id)} className="rounded-lg bg-amber-600 px-3 py-2 text-sm">Check Out</button>
                  <button type="button" onClick={() => void handleDailyCare(item.id)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm">Daily Care</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <form onSubmit={handleAssignRoom} className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Assign Room</h2>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="mb-2 block">Booking</span>
              <select value={selectedBookingId} onChange={(event) => setSelectedBookingId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
                <option value="">Pilih booking</option>
                {bookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>{booking.bookingNo} • {booking.customerName}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Room</span>
              <select value={assignedRoomId} onChange={(event) => setAssignedRoomId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
                <option value="">Pilih room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>{room.roomNo} • {room.status}</option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold">Assign</button>
        </form>

        <form onSubmit={handleReschedule} className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Reschedule</h2>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="mb-2 block">Booking</span>
              <select value={selectedBookingId} onChange={(event) => setSelectedBookingId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
                <option value="">Pilih booking</option>
                {bookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>{booking.bookingNo} • {booking.customerName}</option>
                ))}
              </select>
            </label>
            <input type="date" value={rescheduleCheckIn} onChange={(event) => setRescheduleCheckIn(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            <input type="date" value={rescheduleCheckOut} onChange={(event) => setRescheduleCheckOut(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </div>
          <button type="submit" className="mt-4 w-full rounded-lg bg-slate-800 px-4 py-3 font-semibold">Reschedule</button>
        </form>

        <form onSubmit={handleExtendStay} className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Extend Stay</h2>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="mb-2 block">Booking</span>
              <select value={selectedBookingId} onChange={(event) => setSelectedBookingId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
                <option value="">Pilih booking</option>
                {bookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>{booking.bookingNo} • {booking.customerName}</option>
                ))}
              </select>
            </label>
            <input type="number" min="1" value={extensionNights} onChange={(event) => setExtensionNights(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </div>
          <button type="submit" className="mt-4 w-full rounded-lg bg-amber-600 px-4 py-3 font-semibold">Extend</button>
        </form>
      </div>

      <form onSubmit={handleRoomStatusUpdate} className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Perbarui Status Kamar</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <select value={roomId} onChange={(event) => setRoomId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
            <option value="">Pilih kamar</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>{room.roomNo} • {room.status}</option>
            ))}
          </select>
          <select value={roomStatus} onChange={(event) => setRoomStatus(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="RESERVED">Reserved</option>
            <option value="CLEANING">Cleaning</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="OUT_OF_SERVICE">Out of Service</option>
          </select>
          <select value={cleaningStatus} onChange={(event) => setCleaningStatus(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
            <option value="CLEAN">Clean</option>
            <option value="DIRTY">Dirty</option>
            <option value="IN_PROGRESS">In Progress</option>
          </select>
        </div>
        <button type="submit" className="mt-4 rounded-lg bg-slate-800 px-4 py-3 font-semibold">Update Room</button>
      </form>

      {message ? <p className="text-sm text-slate-300">{message}</p> : null}
    </div>
  );
}

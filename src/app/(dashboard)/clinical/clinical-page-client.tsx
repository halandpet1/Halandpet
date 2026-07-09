'use client';

import { useEffect, useState } from 'react';
import { createAppointment, createMedicalRecord, listAppointments } from '@/actions/clinical.actions';
import { listCustomers, listPets } from '@/actions/customer.actions';

type CustomerOption = { id: string; name: string };
type PetOption = { id: string; name: string; customerId: string };
type AppointmentItem = {
  id: string;
  appointmentDate: string | Date;
  status: string;
  notes?: string | null;
  customer: { id: string; name: string };
  pet: { id: string; name: string };
  doctor?: { id: string; fullName: string } | null;
};

export function ClinicalPageClient() {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [pets, setPets] = useState<PetOption[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [petId, setPetId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [status, setStatus] = useState('SCHEDULED');
  const [notes, setNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    void (async () => {
      const [customerResult, petResult, appointmentResult] = await Promise.all([
        listCustomers({ page: 1, pageSize: 200 }),
        listPets({ page: 1, pageSize: 200 }),
        listAppointments({ page: 1, pageSize: 50 }),
      ]);

      if (customerResult.success) {
        setCustomers((customerResult.data?.items ?? []) as CustomerOption[]);
      }
      if (petResult.success) {
        setPets((petResult.data?.items ?? []) as PetOption[]);
      }
      if (appointmentResult.success) {
        setAppointments((appointmentResult.data?.items ?? []) as AppointmentItem[]);
      }
    })();
  }, []);

  async function handleCreateAppointment(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setFieldErrors({});

    const result = await createAppointment({ customerId, petId, doctorId, appointmentDate, status, notes });
    if (result.success) {
      setMessage('Janji temu berhasil dibuat');
      setCustomerId('');
      setPetId('');
      setDoctorId('');
      setAppointmentDate('');
      setStatus('SCHEDULED');
      setNotes('');
      const appointmentResult = await listAppointments({ page: 1, pageSize: 50 });
      if (appointmentResult.success) {
        setAppointments((appointmentResult.data?.items ?? []) as AppointmentItem[]);
      }
      return;
    }

    setError(result.error);
    setFieldErrors(result.fieldErrors ?? {});
  }

  async function handleCreateMedicalRecord(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setFieldErrors({});

    const result = await createMedicalRecord({ appointmentId: selectedAppointmentId, diagnosis, notes: medicalNotes });
    if (result.success) {
      setMessage('Rekam medis berhasil dibuat');
      setSelectedAppointmentId('');
      setDiagnosis('');
      setMedicalNotes('');
      const appointmentResult = await listAppointments({ page: 1, pageSize: 50 });
      if (appointmentResult.success) {
        setAppointments((appointmentResult.data?.items ?? []) as AppointmentItem[]);
      }
      return;
    }

    setError(result.error);
    setFieldErrors(result.fieldErrors ?? {});
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Klinis</p>
        <h1 className="text-3xl font-semibold">Clinical workflow</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleCreateAppointment} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Buat janji temu</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-2 block">Pelanggan</span>
              <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
                <option value="">Pilih pelanggan</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
              {fieldErrors.customerId ? <span className="mt-2 block text-xs text-rose-400">{fieldErrors.customerId[0]}</span> : null}
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Hewan</span>
              <select value={petId} onChange={(event) => setPetId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
                <option value="">Pilih hewan</option>
                {pets.filter((pet) => pet.customerId === customerId).map((pet) => (
                  <option key={pet.id} value={pet.id}>{pet.name}</option>
                ))}
              </select>
              {fieldErrors.petId ? <span className="mt-2 block text-xs text-rose-400">{fieldErrors.petId[0]}</span> : null}
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Dokter</span>
              <input value={doctorId} onChange={(event) => setDoctorId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" placeholder="ID dokter" />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Tanggal janji</span>
              <input type="datetime-local" value={appointmentDate} onChange={(event) => setAppointmentDate(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              {fieldErrors.appointmentDate ? <span className="mt-2 block text-xs text-rose-400">{fieldErrors.appointmentDate[0]}</span> : null}
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="CHECKED_IN">CHECKED_IN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="NO_SHOW">NO_SHOW</option>
              </select>
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-2 block">Catatan</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            </label>
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">Simpan janji temu</button>
          {message ? <span className="ml-4 text-sm text-emerald-400">{message}</span> : null}
          {error ? <span className="ml-4 text-sm text-rose-400">{error}</span> : null}
        </form>

        <form onSubmit={handleCreateMedicalRecord} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Buat rekam medis</h2>
          <label className="block text-sm">
            <span className="mb-2 block">Appointment</span>
            <select value={selectedAppointmentId} onChange={(event) => setSelectedAppointmentId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
              <option value="">Pilih appointment</option>
              {appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>{appointment.customer.name} - {appointment.pet.name} - {new Date(appointment.appointmentDate).toLocaleString('id-ID')}</option>
              ))}
            </select>
            {fieldErrors.appointmentId ? <span className="mt-2 block text-xs text-rose-400">{fieldErrors.appointmentId[0]}</span> : null}
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Diagnosa</span>
            <textarea value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Catatan</span>
            <textarea value={medicalNotes} onChange={(event) => setMedicalNotes(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2">Simpan rekam medis</button>
          {message ? <span className="ml-4 text-sm text-emerald-400">{message}</span> : null}
          {error ? <span className="ml-4 text-sm text-rose-400">{error}</span> : null}
        </form>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="mb-4 text-xl font-semibold">Daftar appointment</h2>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800 text-left text-slate-300">
              <tr>
                <th className="px-4 py-3">Pelanggan</th>
                <th className="px-4 py-3">Hewan</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.id} className="border-t border-white/10">
                  <td className="px-4 py-3">{appointment.customer.name}</td>
                  <td className="px-4 py-3">{appointment.pet.name}</td>
                  <td className="px-4 py-3">{new Date(appointment.appointmentDate).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3">{appointment.status}</td>
                  <td className="px-4 py-3">{appointment.notes ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

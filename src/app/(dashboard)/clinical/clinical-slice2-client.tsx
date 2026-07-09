'use client';

import { useEffect, useState } from 'react';
import { createDoctorSchedule, createQueue, createSoapNote, createVitalSign, listDoctorSchedules, listQueues, updateQueueStatus } from '@/actions/clinical-slice2.actions';
import { listAppointments } from '@/actions/clinical.actions';

type CustomerOption = { id: string; name: string };
type PetOption = { id: string; name: string; customerId: string };
type AppointmentItem = { id: string; appointmentDate: string | Date; status: string; customer: { id: string; name: string }; pet: { id: string; name: string } };
type QueueItem = { id: string; queueNo: number; status: string; estimatedWaitingMinutes?: number | null; appointment: { customer: { name: string }; pet: { name: string } } };

export function ClinicalSlice2Client() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [maxPatients, setMaxPatients] = useState(10);
  const [queueAppointmentId, setQueueAppointmentId] = useState('');
  const [queueDate, setQueueDate] = useState('');
  const [queueNo, setQueueNo] = useState(1);
  const [estimatedWaitingMinutes, setEstimatedWaitingMinutes] = useState(15);
  const [medicalRecordId, setMedicalRecordId] = useState('');
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weight, setWeight] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [bodyCondition, setBodyCondition] = useState('');
  const [vitalNotes, setVitalNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [appointmentResult, queueResult, scheduleResult] = await Promise.all([
        listAppointments({ page: 1, pageSize: 100 }),
        listQueues({ date: new Date().toISOString().slice(0, 10) }),
        listDoctorSchedules({ date: new Date().toISOString().slice(0, 10) }),
      ]);

      if (appointmentResult.success) setAppointments((appointmentResult.data?.items ?? []) as AppointmentItem[]);
      if (queueResult.success) setQueues((queueResult.data ?? []) as QueueItem[]);
      if (scheduleResult.success) {
        const schedules = scheduleResult.data as Array<{ doctorId: string; scheduleDate: string | Date; startTime: string; endTime: string }>;
        if (schedules[0]) {
          setDoctorId(schedules[0].doctorId);
          setScheduleDate(new Date(schedules[0].scheduleDate).toISOString().slice(0, 10));
          setStartTime(schedules[0].startTime);
          setEndTime(schedules[0].endTime);
        }
      }
    })();
  }, []);

  async function handleScheduleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const result = await createDoctorSchedule({ doctorId, scheduleDate, startTime, endTime, maxPatients });
    if (result.success) {
      setMessage('Jadwal dokter berhasil disimpan');
      return;
    }
    setError(result.error);
  }

  async function handleQueueSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const result = await createQueue({ appointmentId: queueAppointmentId, queueDate, queueNo, estimatedWaitingMinutes });
    if (result.success) {
      setMessage('Pasien berhasil ditambahkan ke antrian');
      const refreshed = await listQueues({ date: queueDate || new Date().toISOString().slice(0, 10) });
      if (refreshed.success) setQueues((refreshed.data ?? []) as QueueItem[]);
      return;
    }
    setError(result.error);
  }

  async function handleSoapSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const result = await createSoapNote({ medicalRecordId, subjective, objective, assessment, plan });
    if (result.success) {
      setMessage('SOAP note berhasil disimpan');
      return;
    }
    setError(result.error);
  }

  async function handleVitalSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const result = await createVitalSign({ medicalRecordId, temperature: temperature ? Number(temperature) : null, weight: weight ? Number(weight) : null, heartRate: heartRate ? Number(heartRate) : null, respiratoryRate: respiratoryRate ? Number(respiratoryRate) : null, bloodPressure, bodyCondition, notes: vitalNotes });
    if (result.success) {
      setMessage('Tanda vital berhasil disimpan');
      return;
    }
    setError(result.error);
  }

  async function handleQueueStatus(id: string, status: string) {
    const result = await updateQueueStatus(id, status);
    if (result.success) {
      const refreshed = await listQueues({ date: queueDate || new Date().toISOString().slice(0, 10) });
      if (refreshed.success) setQueues((refreshed.data ?? []) as QueueItem[]);
      return;
    }
    setError(result.error);
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Klinis</p>
        <h1 className="text-3xl font-semibold">Module 3 — Slice 2</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={handleScheduleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Jadwal dokter</h2>
          <label className="block text-sm">
            <span className="mb-2 block">Dokter</span>
            <input value={doctorId} onChange={(event) => setDoctorId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" placeholder="ID dokter" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Tanggal</span>
            <input type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-2 block">Jam mulai</span>
              <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Jam selesai</span>
              <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-2 block">Maksimal pasien</span>
            <input type="number" value={maxPatients} onChange={(event) => setMaxPatients(Number(event.target.value))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">Simpan jadwal</button>
        </form>

        <form onSubmit={handleQueueSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Manajemen antrian</h2>
          <label className="block text-sm">
            <span className="mb-2 block">Appointment</span>
            <select value={queueAppointmentId} onChange={(event) => setQueueAppointmentId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
              <option value="">Pilih appointment</option>
              {appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>{appointment.customer.name} - {appointment.pet.name}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-2 block">Tanggal antrian</span>
              <input type="date" value={queueDate} onChange={(event) => setQueueDate(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Nomor antrian</span>
              <input type="number" value={queueNo} onChange={(event) => setQueueNo(Number(event.target.value))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-2 block">Estimasi tunggu (menit)</span>
            <input type="number" value={estimatedWaitingMinutes} onChange={(event) => setEstimatedWaitingMinutes(Number(event.target.value))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2">Tambah antrian</button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={handleSoapSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">SOAP Notes</h2>
          <label className="block text-sm">
            <span className="mb-2 block">Medical Record ID</span>
            <input value={medicalRecordId} onChange={(event) => setMedicalRecordId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" placeholder="ID rekam medis" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Subjective</span>
            <textarea value={subjective} onChange={(event) => setSubjective(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Objective</span>
            <textarea value={objective} onChange={(event) => setObjective(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Assessment</span>
            <textarea value={assessment} onChange={(event) => setAssessment(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Plan</span>
            <textarea value={plan} onChange={(event) => setPlan(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2">Simpan SOAP</button>
        </form>

        <form onSubmit={handleVitalSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Vital Signs</h2>
          <label className="block text-sm">
            <span className="mb-2 block">Medical Record ID</span>
            <input value={medicalRecordId} onChange={(event) => setMedicalRecordId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" placeholder="ID rekam medis" />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-2 block">Suhu (°C)</span>
              <input type="number" value={temperature} onChange={(event) => setTemperature(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Berat (kg)</span>
              <input type="number" value={weight} onChange={(event) => setWeight(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">HR</span>
              <input type="number" value={heartRate} onChange={(event) => setHeartRate(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">RR</span>
              <input type="number" value={respiratoryRate} onChange={(event) => setRespiratoryRate(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-2 block">Tekanan darah</span>
            <input value={bloodPressure} onChange={(event) => setBloodPressure(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Body condition</span>
            <input value={bodyCondition} onChange={(event) => setBodyCondition(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Catatan</span>
            <textarea value={vitalNotes} onChange={(event) => setVitalNotes(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2">Simpan tanda vital</button>
        </form>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="mb-4 text-xl font-semibold">Antrian hari ini</h2>
        <div className="space-y-3">
          {queues.map((queue) => (
            <div key={queue.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-3">
              <div>
                <p className="font-medium">#{queue.queueNo} {queue.appointment.customer.name} - {queue.appointment.pet.name}</p>
                <p className="text-sm text-slate-400">Status: {queue.status} • Estimasi: {queue.estimatedWaitingMinutes ?? 0} menit</p>
              </div>
              <div className="flex gap-2">
                {['CALLED', 'COMPLETED', 'SKIPPED', 'CANCELLED'].map((status) => (
                  <button key={status} type="button" onClick={() => void handleQueueStatus(queue.id, status)} className="rounded-lg border border-white/10 px-3 py-1 text-sm">{status}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}

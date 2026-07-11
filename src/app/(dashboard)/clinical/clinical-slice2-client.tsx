'use client';

import { useEffect, useState } from 'react';
import { createDoctorSchedule, createQueue, createSoapNote, createVitalSign, listDoctorSchedules, listMedicalRecords, listQueues, updateQueueStatus } from '@/actions/clinical-slice2.actions';
import { createDiagnosis, createFollowUp, createPrescription, createTreatmentPlan } from '@/actions/clinical-slice3.actions';
import { listAppointments } from '@/actions/clinical.actions';
import { listDoctors } from '@/actions/enterprise.actions';

type AppointmentItem = { id: string; appointmentDate: string | Date; status: string; customer: { id: string; name: string }; pet: { id: string; name: string } };
type QueueItem = { id: string; queueNo: number; status: string; estimatedWaitingMinutes?: number | null; appointment: { customer: { name: string }; pet: { name: string } } };
type DoctorItem = { id: string; fullName: string; username: string };
type MedicalRecordItem = { id: string; appointment: { customer: { name: string }; pet: { name: string } } };

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
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecordItem[]>([]);
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
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState('');
  const [secondaryDiagnosis, setSecondaryDiagnosis] = useState('');
  const [differentialDiagnosis, setDifferentialDiagnosis] = useState('');
  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [diagnosisLocked, setDiagnosisLocked] = useState(false);
  const [treatmentMedical, setTreatmentMedical] = useState('');
  const [treatmentProcedure, setTreatmentProcedure] = useState('');
  const [treatmentObservation, setTreatmentObservation] = useState('');
  const [treatmentHospitalization, setTreatmentHospitalization] = useState('');
  const [treatmentFollowUp, setTreatmentFollowUp] = useState('');
  const [prescriptionDiagnosisId, setPrescriptionDiagnosisId] = useState('');
  const [prescriptionProductId, setPrescriptionProductId] = useState('');
  const [prescriptionMedicine, setPrescriptionMedicine] = useState('');
  const [prescriptionDosage, setPrescriptionDosage] = useState('');
  const [prescriptionFrequency, setPrescriptionFrequency] = useState('');
  const [prescriptionDuration, setPrescriptionDuration] = useState('');
  const [prescriptionInstructions, setPrescriptionInstructions] = useState('');
  const [prescriptionQuantity, setPrescriptionQuantity] = useState('1');
  const [prescriptionRefill, setPrescriptionRefill] = useState('0');
  const [prescriptionWarnings, setPrescriptionWarnings] = useState('');
  const [prescriptionStatus, setPrescriptionStatus] = useState('PRESCRIBED');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpReminder, setFollowUpReminder] = useState('');
  const [followUpReason, setFollowUpReason] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState('SCHEDULED');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [appointmentResult, queueResult, scheduleResult, doctorsResult, recordsResult] = await Promise.all([
        listAppointments({ page: 1, pageSize: 100 }),
        listQueues({ date: new Date().toISOString().slice(0, 10) }),
        listDoctorSchedules({ date: new Date().toISOString().slice(0, 10) }),
        listDoctors(),
        listMedicalRecords({ page: 1, pageSize: 200 }),
      ]);

      if (appointmentResult.success) setAppointments((appointmentResult.data?.items ?? []) as AppointmentItem[]);
      if (queueResult.success) setQueues((queueResult.data ?? []) as QueueItem[]);
      if (doctorsResult.success) {
        setDoctors(doctorsResult.data ?? []);
        if (!doctorId && doctorsResult.data?.[0]) {
          setDoctorId(doctorsResult.data[0].id);
        }
      }
      if (scheduleResult.success) {
        const schedules = scheduleResult.data as Array<{ doctorId: string; scheduleDate: string | Date; startTime: string; endTime: string }>;
        if (schedules[0] && !scheduleDate) {
          setScheduleDate(new Date(schedules[0].scheduleDate).toISOString().slice(0, 10));
          setStartTime(schedules[0].startTime);
          setEndTime(schedules[0].endTime);
        }
      }
      if (recordsResult.success) {
        setMedicalRecords(recordsResult.data ?? []);
        if (!medicalRecordId && recordsResult.data?.[0]) {
          setMedicalRecordId(recordsResult.data[0].id);
        }
      }
    })();
  }, [doctorId, medicalRecordId, scheduleDate]);

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

  async function handleDiagnosisSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const result = await createDiagnosis({ medicalRecordId, primaryDiagnosis, secondaryDiagnosis, differentialDiagnosis, clinicalNotes: diagnosisNotes, isLocked: diagnosisLocked });
    if (result.success) {
      setMessage('Diagnosis berhasil disimpan');
      return;
    }
    setError(result.error);
  }

  async function handleTreatmentSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const result = await createTreatmentPlan({ medicalRecordId, medicalTreatment: treatmentMedical, procedure: treatmentProcedure, observation: treatmentObservation, hospitalizationRecommendation: treatmentHospitalization, followUpRecommendation: treatmentFollowUp });
    if (result.success) {
      setMessage('Treatment plan berhasil disimpan');
      return;
    }
    setError(result.error);
  }

  async function handlePrescriptionSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const result = await createPrescription({ medicalRecordId, diagnosisId: prescriptionDiagnosisId, productId: prescriptionProductId, medicine: prescriptionMedicine, dosage: prescriptionDosage, frequency: prescriptionFrequency, duration: prescriptionDuration, instructions: prescriptionInstructions, quantity: Number(prescriptionQuantity), refill: Number(prescriptionRefill), warnings: prescriptionWarnings, status: prescriptionStatus as 'PRESCRIBED' | 'DISPENSED' | 'CANCELLED' });
    if (result.success) {
      setMessage('Resep berhasil disimpan');
      return;
    }
    setError(result.error);
  }

  async function handleFollowUpSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const result = await createFollowUp({ medicalRecordId, nextVisitDate: followUpDate, reminder: followUpReminder, reason: followUpReason, status: followUpStatus });
    if (result.success) {
      setMessage('Follow up berhasil disimpan');
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
            <select value={doctorId} onChange={(event) => setDoctorId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
              <option value="">Pilih dokter</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>{doctor.fullName} ({doctor.username})</option>
              ))}
            </select>
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
            <span className="mb-2 block">Medical Record</span>
            <select value={medicalRecordId} onChange={(event) => setMedicalRecordId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
              <option value="">Pilih rekam medis</option>
              {medicalRecords.map((record) => (
                <option key={record.id} value={record.id}>{record.appointment.customer.name} - {record.appointment.pet.name} ({record.id})</option>
              ))}
            </select>
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
            <span className="mb-2 block">Medical Record</span>
            <select value={medicalRecordId} onChange={(event) => setMedicalRecordId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
              <option value="">Pilih rekam medis</option>
              {medicalRecords.map((record) => (
                <option key={record.id} value={record.id}>{record.appointment.customer.name} - {record.appointment.pet.name} ({record.id})</option>
              ))}
            </select>
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

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={handleDiagnosisSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Diagnosis</h2>
          <label className="block text-sm">
            <span className="mb-2 block">Medical Record</span>
            <select value={medicalRecordId} onChange={(event) => setMedicalRecordId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
              <option value="">Pilih rekam medis</option>
              {medicalRecords.map((record) => (
                <option key={record.id} value={record.id}>{record.appointment.customer.name} - {record.appointment.pet.name} ({record.id})</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Primary diagnosis</span>
            <input value={primaryDiagnosis} onChange={(event) => setPrimaryDiagnosis(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Secondary diagnosis</span>
            <input value={secondaryDiagnosis} onChange={(event) => setSecondaryDiagnosis(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Differential diagnosis</span>
            <input value={differentialDiagnosis} onChange={(event) => setDifferentialDiagnosis(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Clinical notes</span>
            <textarea value={diagnosisNotes} onChange={(event) => setDiagnosisNotes(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={diagnosisLocked} onChange={(event) => setDiagnosisLocked(event.target.checked)} />
            <span>Lock after completion</span>
          </label>
          <button type="submit" className="rounded-lg bg-rose-600 px-4 py-2">Simpan diagnosis</button>
        </form>

        <form onSubmit={handleTreatmentSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Treatment Plan</h2>
          <label className="block text-sm">
            <span className="mb-2 block">Medical Record</span>
            <select value={medicalRecordId} onChange={(event) => setMedicalRecordId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
              <option value="">Pilih rekam medis</option>
              {medicalRecords.map((record) => (
                <option key={record.id} value={record.id}>{record.appointment.customer.name} - {record.appointment.pet.name} ({record.id})</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Medical treatment</span>
            <textarea value={treatmentMedical} onChange={(event) => setTreatmentMedical(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Procedure</span>
            <textarea value={treatmentProcedure} onChange={(event) => setTreatmentProcedure(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Observation</span>
            <textarea value={treatmentObservation} onChange={(event) => setTreatmentObservation(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Hospitalization recommendation</span>
            <input value={treatmentHospitalization} onChange={(event) => setTreatmentHospitalization(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Follow-up recommendation</span>
            <input value={treatmentFollowUp} onChange={(event) => setTreatmentFollowUp(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2">Simpan treatment plan</button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={handlePrescriptionSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Prescription</h2>
          <label className="block text-sm">
            <span className="mb-2 block">Medical Record</span>
            <select value={medicalRecordId} onChange={(event) => setMedicalRecordId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
              <option value="">Pilih rekam medis</option>
              {medicalRecords.map((record) => (
                <option key={record.id} value={record.id}>{record.appointment.customer.name} - {record.appointment.pet.name} ({record.id})</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Diagnosis ID</span>
            <input value={prescriptionDiagnosisId} onChange={(event) => setPrescriptionDiagnosisId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Product ID</span>
            <input value={prescriptionProductId} onChange={(event) => setPrescriptionProductId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Medicine</span>
            <input value={prescriptionMedicine} onChange={(event) => setPrescriptionMedicine(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-2 block">Dosage</span>
              <input value={prescriptionDosage} onChange={(event) => setPrescriptionDosage(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Frequency</span>
              <input value={prescriptionFrequency} onChange={(event) => setPrescriptionFrequency(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Duration</span>
              <input value={prescriptionDuration} onChange={(event) => setPrescriptionDuration(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Quantity</span>
              <input type="number" value={prescriptionQuantity} onChange={(event) => setPrescriptionQuantity(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-2 block">Instructions</span>
            <textarea value={prescriptionInstructions} onChange={(event) => setPrescriptionInstructions(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Refill</span>
            <input type="number" value={prescriptionRefill} onChange={(event) => setPrescriptionRefill(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Warnings</span>
            <textarea value={prescriptionWarnings} onChange={(event) => setPrescriptionWarnings(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Status</span>
            <select value={prescriptionStatus} onChange={(event) => setPrescriptionStatus(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
              <option value="PRESCRIBED">PRESCRIBED</option>
              <option value="DISPENSED">DISPENSED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2">Simpan resep</button>
        </form>

        <form onSubmit={handleFollowUpSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Follow Up</h2>
          <label className="block text-sm">
            <span className="mb-2 block">Medical Record</span>
            <select value={medicalRecordId} onChange={(event) => setMedicalRecordId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
              <option value="">Pilih rekam medis</option>
              {medicalRecords.map((record) => (
                <option key={record.id} value={record.id}>{record.appointment.customer.name} - {record.appointment.pet.name} ({record.id})</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Next visit</span>
            <input type="date" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Reminder</span>
            <input value={followUpReminder} onChange={(event) => setFollowUpReminder(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Reason</span>
            <textarea value={followUpReason} onChange={(event) => setFollowUpReason(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Status</span>
            <input value={followUpStatus} onChange={(event) => setFollowUpStatus(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2">Simpan follow up</button>
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

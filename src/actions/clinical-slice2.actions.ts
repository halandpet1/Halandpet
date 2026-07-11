'use server';

import { Prisma, type UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { doctorScheduleSchema, queueSchema, soapSchema, vitalSignSchema } from '@/validators/clinical-slice2.schema';
import { parseOrFail, revalidateCustomerViews, requireRole, type ActionResult } from '@/lib/action-utils';

const scheduleRoles: UserRole[] = ['OWNER', 'ADMIN', 'DOCTOR'];
const queueRoles: UserRole[] = ['OWNER', 'ADMIN', 'DOCTOR', 'STAFF'];
const doctorRoles: UserRole[] = ['OWNER', 'ADMIN', 'DOCTOR'];
const staffViewRoles: UserRole[] = ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF'];

async function assertRole(allowedRoles: UserRole[]) {
  const user = await requireRole(allowedRoles);
  if (!user) {
    return null;
  }

  return user;
}

function parseDate(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseTime(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  return value;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(':').map((part) => Number(part));
  return hours * 60 + minutes;
}

export async function createDoctorSchedule(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(scheduleRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(doctorScheduleSchema, rawData);
  if (!parsed.success) return parsed;

  const scheduleDate = parseDate(parsed.data.scheduleDate);
  if (!scheduleDate) {
    return { success: false, error: 'Tanggal jadwal tidak valid', fieldErrors: { scheduleDate: ['Tanggal jadwal tidak valid'] } };
  }

  const startTime = parseTime(parsed.data.startTime);
  const endTime = parseTime(parsed.data.endTime);
  const breakStartTime = parseTime(parsed.data.breakStartTime);
  const breakEndTime = parseTime(parsed.data.breakEndTime);
  if (!startTime || !endTime) {
    return { success: false, error: 'Jam kerja tidak valid' };
  }

  const overlappingSchedule = await db.doctorSchedule.findFirst({
    where: {
      doctorId: parsed.data.doctorId,
      scheduleDate,
      deletedAt: null,
      status: { notIn: ['LEAVE', 'UNAVAILABLE'] },
    },
    select: { id: true, startTime: true, endTime: true },
  });

  if (overlappingSchedule) {
    const currentStartMinutes = toMinutes(startTime);
    const currentEndMinutes = toMinutes(endTime);
    const existingStartMinutes = toMinutes(overlappingSchedule.startTime);
    const existingEndMinutes = toMinutes(overlappingSchedule.endTime);
    if (currentStartMinutes < existingEndMinutes && currentEndMinutes > existingStartMinutes) {
      return { success: false, error: 'Jadwal dokter bentrok dengan jadwal yang sudah ada' };
    }
  }

  const queueCount = await db.queue.count({ where: { queueDate: scheduleDate, deletedAt: null, doctorId: parsed.data.doctorId, status: { in: ['WAITING', 'CALLED', 'SKIPPED'] } } });
  if (queueCount >= parsed.data.maxPatients) {
    return { success: false, error: 'Kapasitas pasien harian sudah tercapai' };
  }

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.doctorSchedule.create({
      data: {
        doctorId: parsed.data.doctorId,
        scheduleDate,
        startTime,
        endTime,
        breakStartTime: breakStartTime ?? null,
        breakEndTime: breakEndTime ?? null,
        status: parsed.data.status ?? 'WORKING',
        maxPatients: parsed.data.maxPatients,
        notes: parsed.data.notes?.trim() || null,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });

    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'DoctorSchedule', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
    return created;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: result.id } };
}

export async function listDoctorSchedules(params?: { doctorId?: string; date?: string }) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(staffViewRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const date = params?.date ? new Date(params.date) : undefined;
  const where = {
    deletedAt: null,
    ...(params?.doctorId ? { doctorId: params.doctorId } : {}),
    ...(date ? { scheduleDate: { gte: new Date(date.setHours(0, 0, 0, 0)), lte: new Date(date.setHours(23, 59, 59, 999)) } } : {}),
  };

  const items = await db.doctorSchedule.findMany({ where, orderBy: { scheduleDate: 'asc' }, include: { doctor: { select: { id: true, fullName: true } } } });
  return { success: true, data: items };
}

export async function createQueue(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(queueRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(queueSchema, rawData);
  if (!parsed.success) return parsed;

  const queueDate = parseDate(parsed.data.queueDate);
  if (!queueDate) {
    return { success: false, error: 'Tanggal antrian tidak valid', fieldErrors: { queueDate: ['Tanggal antrian tidak valid'] } };
  }

  const existing = await db.queue.findFirst({ where: { appointmentId: parsed.data.appointmentId, deletedAt: null }, select: { id: true } });
  if (existing) return { success: false, error: 'Antrian sudah ada untuk appointment ini' };

  const appointment = await db.appointment.findFirst({ where: { id: parsed.data.appointmentId, deletedAt: null }, select: { id: true, doctorId: true, appointmentDate: true, status: true } });
  if (!appointment) return { success: false, error: 'Janji temu tidak ditemukan' };
  if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)) {
    return { success: false, error: 'Appointment sudah tidak aktif untuk antrian' };
  }

  const appointmentDay = appointment.appointmentDate.toISOString().slice(0, 10);
  const queueDay = queueDate.toISOString().slice(0, 10);
  if (appointmentDay !== queueDay) {
    return { success: false, error: 'Tanggal antrian harus sesuai dengan tanggal appointment' };
  }

  const nextQueueNo = await db.queue.count({ where: { queueDate, deletedAt: null } }) + 1;
  const targetDoctorId = parsed.data.doctorId?.trim() || appointment.doctorId || null;

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.queue.create({
      data: {
        appointmentId: parsed.data.appointmentId,
        doctorId: targetDoctorId,
        queueDate,
        queueNo: parsed.data.queueNo || nextQueueNo,
        status: parsed.data.status ?? 'WAITING',
        estimatedWaitingMinutes: parsed.data.estimatedWaitingMinutes ?? null,
        notes: parsed.data.notes?.trim() || null,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });

    await tx.appointment.update({ where: { id: appointment.id }, data: { status: 'WAITING', updatedBy: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Queue', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
    return created;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: result.id } };
}

export async function updateQueueStatus(id: string, status: string): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(queueRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const existing = await db.queue.findFirst({ where: { id, deletedAt: null }, select: { id: true, appointmentId: true } });
  if (!existing) return { success: false, error: 'Antrian tidak ditemukan' };

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.queue.update({ where: { id }, data: { status: status as 'WAITING' | 'CALLED' | 'SKIPPED' | 'COMPLETED' | 'CANCELLED', updatedBy: actor.id } });

    if (status === 'CALLED') {
      await tx.appointment.update({ where: { id: existing.appointmentId }, data: { status: 'CONSULTING', updatedBy: actor.id } });
    } else if (status === 'COMPLETED') {
      await tx.appointment.update({ where: { id: existing.appointmentId }, data: { status: 'COMPLETED', updatedBy: actor.id } });
    }

    await tx.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'Queue', entityId: updated.id, changes: { status } as Prisma.InputJsonValue } });
    return updated;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: result.id } };
}

export async function listQueues(params?: { date?: string; doctorId?: string }) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(staffViewRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const date = params?.date ? new Date(params.date) : undefined;
  const where = {
    deletedAt: null,
    ...(params?.doctorId ? { doctorId: params.doctorId } : {}),
    ...(date ? { queueDate: { gte: new Date(date.setHours(0, 0, 0, 0)), lte: new Date(date.setHours(23, 59, 59, 999)) } } : {}),
  };

  const items = await db.queue.findMany({ where, orderBy: [{ queueNo: 'asc' }], include: { appointment: { include: { customer: { select: { id: true, name: true } }, pet: { select: { id: true, name: true } } } } } });
  return { success: true, data: items };
}

export async function createSoapNote(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(doctorRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(soapSchema, rawData);
  if (!parsed.success) return parsed;

  const medicalRecord = await db.medicalRecord.findFirst({ where: { id: parsed.data.medicalRecordId, deletedAt: null }, select: { id: true, appointmentId: true } });
  if (!medicalRecord) return { success: false, error: 'Rekam medis tidak ditemukan' };

  const existing = await db.soapNote.findFirst({ where: { medicalRecordId: parsed.data.medicalRecordId, deletedAt: null }, select: { id: true } });
  if (existing) return { success: false, error: 'SOAP note sudah ada untuk rekam medis ini' };

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.soapNote.create({
      data: {
        medicalRecordId: parsed.data.medicalRecordId,
        doctorId: actor.id,
        subjective: parsed.data.subjective?.trim() || null,
        objective: parsed.data.objective?.trim() || null,
        assessment: parsed.data.assessment?.trim() || null,
        plan: parsed.data.plan?.trim() || null,
        consultationStartedAt: new Date(),
        isLocked: parsed.data.isLocked ?? false,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });

    await tx.appointment.update({ where: { id: medicalRecord.appointmentId }, data: { status: 'CONSULTING', updatedBy: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'SoapNote', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
    return created;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: result.id } };
}

export async function updateSoapNote(id: string, rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(doctorRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(soapSchema, rawData);
  if (!parsed.success) return parsed;

  const existing = await db.soapNote.findFirst({ where: { id, deletedAt: null }, select: { id: true, isLocked: true } });
  if (!existing) return { success: false, error: 'SOAP note tidak ditemukan' };
  if (existing.isLocked) return { success: false, error: 'SOAP note sudah terkunci' };

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.soapNote.update({
      where: { id },
      data: {
        doctorId: parsed.data.doctorId || actor.id,
        subjective: parsed.data.subjective?.trim() || null,
        objective: parsed.data.objective?.trim() || null,
        assessment: parsed.data.assessment?.trim() || null,
        plan: parsed.data.plan?.trim() || null,
        consultationEndedAt: parsed.data.isLocked ? new Date() : null,
        isLocked: parsed.data.isLocked ?? false,
        updatedBy: actor.id,
      },
    });

    await tx.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'SoapNote', entityId: updated.id, changes: parsed.data as Prisma.InputJsonValue } });
    return updated;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: result.id } };
}

export async function createVitalSign(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(doctorRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(vitalSignSchema, rawData);
  if (!parsed.success) return parsed;

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.vitalSignRecord.create({
      data: {
        medicalRecordId: parsed.data.medicalRecordId,
        recordedAt: new Date(),
        temperature: parsed.data.temperature ?? null,
        weight: parsed.data.weight ?? null,
        heartRate: parsed.data.heartRate ?? null,
        respiratoryRate: parsed.data.respiratoryRate ?? null,
        bloodPressure: parsed.data.bloodPressure?.trim() || null,
        bodyCondition: parsed.data.bodyCondition?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });

    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'VitalSignRecord', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
    return created;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: result.id } };
}

export async function getClinicalTimeline(medicalRecordId: string) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(staffViewRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const medicalRecord = await db.medicalRecord.findFirst({
    where: { id: medicalRecordId, deletedAt: null },
    select: {
      id: true,
      notes: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      appointmentId: true,
    },
  });
  if (!medicalRecord) return { success: false, error: 'Rekam medis tidak ditemukan' };

  const appointmentResult = await db.appointment.findFirst({ where: { id: medicalRecord.appointmentId, deletedAt: null }, select: { id: true, appointmentDate: true, status: true, customer: { select: { id: true, name: true } }, pet: { select: { id: true, name: true } } } });
  if (!appointmentResult) return { success: false, error: 'Janji temu tidak ditemukan' };

  const [diagnosis, treatmentPlan, soapNote, vitalSigns, attachments, prescriptions, vaccinations, weights, allergies, diseases] = await Promise.all([
    db.diagnosis.findFirst({ where: { medicalRecordId, deletedAt: null }, select: { id: true, primaryDiagnosis: true, clinicalNotes: true } }),
    db.treatmentPlan.findFirst({ where: { medicalRecordId, deletedAt: null }, select: { id: true, procedure: true, observation: true, medicalTreatment: true } }),
    db.soapNote.findFirst({ where: { medicalRecordId, deletedAt: null }, select: { id: true, createdAt: true, updatedAt: true, subjective: true, objective: true, assessment: true, plan: true } }),
    db.vitalSignRecord.findMany({ where: { medicalRecordId, deletedAt: null }, orderBy: { recordedAt: 'asc' } }),
    db.attachment.findMany({ where: { entityType: 'MR', entityId: medicalRecordId, deletedAt: null }, orderBy: { createdAt: 'desc' } }),
    db.prescription.findMany({ where: { medicalRecordId, deletedAt: null }, orderBy: { createdAt: 'desc' } }),
    db.vaccinationRecord.findMany({ where: { petId: appointmentResult.pet.id, deletedAt: null }, orderBy: { date: 'desc' } }),
    db.weightHistory.findMany({ where: { petId: appointmentResult.pet.id, deletedAt: null }, orderBy: { date: 'desc' } }),
    db.allergy.findMany({ where: { petId: appointmentResult.pet.id, deletedAt: null }, orderBy: { createdAt: 'desc' } }),
    db.diseaseHistory.findMany({ where: { petId: appointmentResult.pet.id, deletedAt: null }, orderBy: { diagnosedDate: 'desc' } }),
  ]);

  const timelineItems = [
    {
      id: appointmentResult.id,
      kind: 'appointment',
      title: `Appointment • ${appointmentResult.customer.name}`,
      date: appointmentResult.appointmentDate,
      detail: `Pasien: ${appointmentResult.pet.name} • Status: ${appointmentResult.status}`,
    },
    ...(soapNote ? [{ id: soapNote.id, kind: 'soap', title: 'SOAP', date: soapNote.createdAt, detail: soapNote.assessment || soapNote.plan || 'SOAP note tersedia' }] : []),
    ...vitalSigns.map((item) => ({ id: item.id, kind: 'vitals', title: 'Vital Signs', date: item.recordedAt, detail: `Suhu: ${item.temperature ?? '-'} • Berat: ${item.weight ?? '-'}` })),
    {
      id: `${medicalRecord.id}-diagnosis`,
      kind: 'diagnosis',
      title: 'Diagnosis',
      date: medicalRecord.createdAt,
      detail: [diagnosis?.primaryDiagnosis, diagnosis?.clinicalNotes].filter(Boolean).join(' • ') || 'Belum ada diagnosis',
    },
    {
      id: `${medicalRecord.id}-treatment`,
      kind: 'treatment',
      title: 'Treatment Plan',
      date: medicalRecord.updatedAt,
      detail: treatmentPlan?.observation || treatmentPlan?.medicalTreatment || medicalRecord.notes || 'Belum ada tindakan',
    },
    {
      id: `${medicalRecord.id}-prescription`,
      kind: 'prescription',
      title: 'Prescription',
      date: medicalRecord.updatedAt,
      detail: prescriptions.length ? prescriptions.map((item) => item.medicine).join(', ') : 'Belum ada resep',
    },
    ...attachments.map((item) => ({ id: item.id, kind: 'attachment', title: 'Attachment', date: item.createdAt, detail: item.fileName })),
    ...vaccinations.map((item) => ({ id: item.id, kind: 'vaccination', title: item.vaccineName, date: item.date, detail: item.notes || 'Vaksinasi' })),
    ...weights.map((item) => ({ id: item.id, kind: 'weight', title: `${item.weight} kg`, date: item.date, detail: item.notes || 'Berat badan' })),
    ...diseases.map((item) => ({ id: item.id, kind: 'disease', title: item.diseaseName, date: item.diagnosedDate, detail: item.notes || item.status || 'Riwayat penyakit' })),
    ...allergies.map((item) => ({ id: item.id, kind: 'allergy', title: item.allergen, date: item.createdAt, detail: item.notes || item.severity || 'Alergi' })),
  ].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

  return { success: true, data: { soapNote, vitalSigns, appointments: [appointmentResult], attachments, timelineItems, prescriptions, vaccinations, weights, allergies, diseases } };
}

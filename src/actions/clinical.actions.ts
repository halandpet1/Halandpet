'use server';

import type { Prisma, UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { appointmentSchema, medicalRecordSchema } from '@/validators/clinical.schema';
import { parseOrFail, revalidateCustomerViews, requireRole, type ActionResult } from '@/lib/action-utils';

const appointmentRoles: UserRole[] = ['OWNER', 'ADMIN', 'DOCTOR', 'STAFF'];
const medicalRecordRoles: UserRole[] = ['OWNER', 'DOCTOR'];
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

export async function createAppointment(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole(appointmentRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(appointmentSchema, rawData);
  if (!parsed.success) return parsed;

  const appointmentDate = parseDate(parsed.data.appointmentDate);
  if (!appointmentDate) {
    return { success: false, error: 'Tanggal janji tidak valid', fieldErrors: { appointmentDate: ['Tanggal janji tidak valid'] } };
  }

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const appointment = await tx.appointment.create({
      data: {
        customerId: parsed.data.customerId,
        petId: parsed.data.petId,
        doctorId: parsed.data.doctorId || null,
        appointmentDate,
        status: parsed.data.status ?? 'SCHEDULED',
        notes: parsed.data.notes?.trim() || null,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: 'CREATE',
        entity: 'Appointment',
        entityId: appointment.id,
        changes: parsed.data as Prisma.InputJsonValue,
      },
    });

    return appointment;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: result.id } };
}

export async function updateAppointment(id: string, rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole(appointmentRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(appointmentSchema, rawData);
  if (!parsed.success) return parsed;

  const appointmentDate = parseDate(parsed.data.appointmentDate);
  if (!appointmentDate) {
    return { success: false, error: 'Tanggal janji tidak valid', fieldErrors: { appointmentDate: ['Tanggal janji tidak valid'] } };
  }

  const existing = await db.appointment.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!existing) return { success: false, error: 'Janji temu tidak ditemukan' };

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const appointment = await tx.appointment.update({
      where: { id },
      data: {
        customerId: parsed.data.customerId,
        petId: parsed.data.petId,
        doctorId: parsed.data.doctorId || null,
        appointmentDate,
        status: parsed.data.status ?? 'SCHEDULED',
        notes: parsed.data.notes?.trim() || null,
        updatedBy: actor.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: 'UPDATE',
        entity: 'Appointment',
        entityId: appointment.id,
        changes: parsed.data as Prisma.InputJsonValue,
      },
    });

    return appointment;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: result.id } };
}

export async function softDeleteAppointment(id: string): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole(appointmentRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const existing = await db.appointment.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!existing) return { success: false, error: 'Janji temu tidak ditemukan' };

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const appointment = await tx.appointment.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'SOFT_DELETE', entity: 'Appointment', entityId: appointment.id, changes: { deletedAt: appointment.deletedAt } as Prisma.InputJsonValue } });
    return appointment;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: result.id } };
}

export async function listAppointments(params?: { page?: number; pageSize?: number; search?: string; status?: string }) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole(staffViewRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  const search = params?.search?.trim();
  const where = {
    deletedAt: null,
    ...(params?.status ? { status: params.status as Prisma.EnumAppointmentStatusFilter } : {}),
    ...(search
      ? {
          OR: [
            { notes: { contains: search, mode: 'insensitive' as const } },
            { customer: { name: { contains: search, mode: 'insensitive' as const } } },
            { pet: { name: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.appointment.findMany({
      where,
      orderBy: { appointmentDate: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        appointmentDate: true,
        status: true,
        notes: true,
        customer: { select: { id: true, name: true } },
        pet: { select: { id: true, name: true } },
        doctor: { select: { id: true, fullName: true } },
      },
    }),
    db.appointment.count({ where }),
  ]);

  return { success: true, data: { items, total, page, pageSize } };
}

export async function createMedicalRecord(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole(medicalRecordRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(medicalRecordSchema, rawData);
  if (!parsed.success) return parsed;

  const appointment = await db.appointment.findFirst({ where: { id: parsed.data.appointmentId, deletedAt: null }, select: { id: true, customerId: true, petId: true, doctorId: true, status: true } });
  if (!appointment) return { success: false, error: 'Janji temu tidak ditemukan' };
  if (appointment.doctorId && appointment.doctorId !== actor.id && actor.role !== 'OWNER') {
    return { success: false, error: 'Tidak diizinkan' };
  }

  const existing = await db.medicalRecord.findFirst({ where: { appointmentId: appointment.id }, select: { id: true } });
  if (existing) return { success: false, error: 'Rekam medis sudah ada untuk appointment ini' };

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const medicalRecord = await tx.medicalRecord.create({
      data: {
        appointmentId: appointment.id,
        customerId: appointment.customerId,
        doctorId: actor.id,
        notes: parsed.data.notes?.trim() || null,
        status: parsed.data.status?.trim() || 'OPEN',
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });

    await tx.appointment.update({ where: { id: appointment.id }, data: { status: 'CONSULTING', updatedBy: actor.id } });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: 'CREATE',
        entity: 'MedicalRecord',
        entityId: medicalRecord.id,
        changes: parsed.data as Prisma.InputJsonValue,
      },
    });

    return medicalRecord;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: result.id } };
}

export async function getMedicalRecordByAppointmentId(appointmentId: string) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole(staffViewRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const medicalRecord = await db.medicalRecord.findFirst({
    where: { appointmentId, deletedAt: null },
    select: {
      id: true,
      notes: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      appointment: { select: { id: true, appointmentDate: true, status: true, customer: { select: { id: true, name: true } }, pet: { select: { id: true, name: true } } } },
      doctor: { select: { id: true, fullName: true } },
    },
  });

  return medicalRecord ? { success: true, data: medicalRecord } : { success: false, error: 'Rekam medis tidak ditemukan' };
}

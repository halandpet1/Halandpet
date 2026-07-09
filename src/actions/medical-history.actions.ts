'use server';

import { Prisma, type UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { parseOrFail, revalidateCustomerViews, requireRole, type ActionResult } from '@/lib/action-utils';
import { z } from 'zod';

const allowedRoles: UserRole[] = ['OWNER', 'ADMIN', 'DOCTOR'];

async function assertRole() {
  const actor = await requireRole(allowedRoles);
  if (!actor) {
    return null;
  }

  return actor;
}

const vaccinationSchema = z.object({
  petId: z.string().min(1),
  vaccineName: z.string().trim().min(2),
  date: z.string().min(1),
  nextDueDate: z.string().optional().or(z.literal('')),
  batchNumber: z.string().optional().or(z.literal('')),
  veterinarian: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

const weightSchema = z.object({
  petId: z.string().min(1),
  date: z.string().min(1),
  weight: z.coerce.number().min(0),
  notes: z.string().optional().or(z.literal('')),
});

const allergySchema = z.object({
  petId: z.string().min(1),
  allergen: z.string().trim().min(2),
  severity: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

const diseaseSchema = z.object({
  petId: z.string().min(1),
  diseaseName: z.string().trim().min(2),
  diagnosedDate: z.string().min(1),
  resolvedDate: z.string().optional().or(z.literal('')),
  status: z.string().optional().or(z.literal('ACTIVE')),
  notes: z.string().optional().or(z.literal('')),
});

const attachmentSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  fileName: z.string().trim().min(1),
  fileUrl: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  fileSize: z.coerce.number().min(0),
});

export async function createVaccination(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };
  const parsed = await parseOrFail(vaccinationSchema, rawData);
  if (!parsed.success) return parsed;

  const item = await db.$transaction(async (tx) => {
    const created = await tx.vaccinationRecord.create({
      data: {
        ...parsed.data,
        petId: parsed.data.petId,
        date: new Date(parsed.data.date),
        nextDueDate: parsed.data.nextDueDate ? new Date(parsed.data.nextDueDate) : null,
        createdBy: actor.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: 'CREATE',
        entity: 'VaccinationRecord',
        entityId: created.id,
        changes: parsed.data as Prisma.InputJsonValue,
      },
    });

    return created;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: item.id } };
}

export async function createWeight(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };
  const parsed = await parseOrFail(weightSchema, rawData);
  if (!parsed.success) return parsed;

  const item = await db.$transaction(async (tx) => {
    const created = await tx.weightHistory.create({
      data: {
        petId: parsed.data.petId,
        date: new Date(parsed.data.date),
        weight: parsed.data.weight,
        notes: parsed.data.notes || null,
        createdBy: actor.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: 'CREATE',
        entity: 'WeightHistory',
        entityId: created.id,
        changes: parsed.data as Prisma.InputJsonValue,
      },
    });

    return created;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: item.id } };
}

export async function createAllergy(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };
  const parsed = await parseOrFail(allergySchema, rawData);
  if (!parsed.success) return parsed;

  const item = await db.$transaction(async (tx) => {
    const created = await tx.allergy.create({
      data: {
        petId: parsed.data.petId,
        allergen: parsed.data.allergen,
        severity: parsed.data.severity || null,
        notes: parsed.data.notes || null,
        createdBy: actor.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: 'CREATE',
        entity: 'Allergy',
        entityId: created.id,
        changes: parsed.data as Prisma.InputJsonValue,
      },
    });

    return created;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: item.id } };
}

export async function createDisease(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };
  const parsed = await parseOrFail(diseaseSchema, rawData);
  if (!parsed.success) return parsed;

  const item = await db.$transaction(async (tx) => {
    const created = await tx.diseaseHistory.create({
      data: {
        petId: parsed.data.petId,
        diseaseName: parsed.data.diseaseName,
        diagnosedDate: new Date(parsed.data.diagnosedDate),
        resolvedDate: parsed.data.resolvedDate ? new Date(parsed.data.resolvedDate) : null,
        status: parsed.data.status || 'ACTIVE',
        notes: parsed.data.notes || null,
        createdBy: actor.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: 'CREATE',
        entity: 'DiseaseHistory',
        entityId: created.id,
        changes: parsed.data as Prisma.InputJsonValue,
      },
    });

    return created;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: item.id } };
}

export async function createAttachment(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };
  const parsed = await parseOrFail(attachmentSchema, rawData);
  if (!parsed.success) return parsed;

  const item = await db.$transaction(async (tx) => {
    const created = await tx.attachment.create({
      data: {
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        fileName: parsed.data.fileName,
        fileUrl: parsed.data.fileUrl,
        mimeType: parsed.data.mimeType,
        fileSize: parsed.data.fileSize,
        createdBy: actor.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: 'CREATE',
        entity: 'Attachment',
        entityId: created.id,
        changes: parsed.data as Prisma.InputJsonValue,
      },
    });

    return created;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: item.id } };
}

export async function listMedicalHistory(petId: string) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const [vaccinations, weights, allergies, diseases, attachments] = await Promise.all([
    db.vaccinationRecord.findMany({ where: { petId, deletedAt: null }, orderBy: { date: 'desc' } }),
    db.weightHistory.findMany({ where: { petId }, orderBy: { date: 'desc' } }),
    db.allergy.findMany({ where: { petId, deletedAt: null }, orderBy: { createdAt: 'desc' } }),
    db.diseaseHistory.findMany({ where: { petId, deletedAt: null }, orderBy: { diagnosedDate: 'desc' } }),
    db.attachment.findMany({ where: { entityId: petId, entityType: 'PET', deletedAt: null }, orderBy: { createdAt: 'desc' } }),
  ]);

  return {
    success: true,
    data: { vaccinations, weights, allergies, diseases, attachments },
  };
}

'use server';

import { Prisma, type UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { parseOrFail, revalidateCustomerViews, requireRole, type ActionResult } from '@/lib/action-utils';
import { z } from 'zod';

const allowedRoles: UserRole[] = ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF', 'CUSTOMER'];

type SessionActor = {
  id: string;
  role: UserRole;
  fullName: string;
};

async function assertRole() {
  const actor = await requireRole(allowedRoles);
  if (!actor) {
    return null;
  }

  return actor as SessionActor;
}

async function ensurePetAccess(actor: SessionActor, petId: string) {
  if (!db) {
    return null;
  }

  if (actor.role !== 'CUSTOMER') {
    const pet = await db.pet.findFirst({ where: { id: petId, deletedAt: null }, select: { id: true } });
    return pet?.id ?? null;
  }

  const customer = await db.customer.findFirst({ where: { userId: actor.id, deletedAt: null }, select: { id: true } });
  if (!customer) {
    return null;
  }

  const pet = await db.pet.findFirst({ where: { id: petId, customerId: customer.id, deletedAt: null }, select: { id: true } });
  return pet?.id ?? null;
}

function parseDate(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const vaccinationSchema = z.object({
  petId: z.string().trim().min(1),
  vaccineName: z.string().trim().min(2),
  date: z.string().trim().min(1),
  nextDueDate: z.string().trim().optional().or(z.literal('')),
  batchNumber: z.string().trim().optional().or(z.literal('')),
  veterinarian: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
});

const weightSchema = z.object({
  petId: z.string().trim().min(1),
  date: z.string().trim().min(1),
  weight: z.coerce.number().min(0).max(1000),
  notes: z.string().trim().optional().or(z.literal('')),
});

const allergySchema = z.object({
  petId: z.string().trim().min(1),
  allergen: z.string().trim().min(2),
  severity: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
});

const diseaseSchema = z.object({
  petId: z.string().trim().min(1),
  diseaseName: z.string().trim().min(2),
  diagnosedDate: z.string().trim().min(1),
  resolvedDate: z.string().trim().optional().or(z.literal('')),
  status: z.string().trim().optional().or(z.literal('ACTIVE')),
  notes: z.string().trim().optional().or(z.literal('')),
});

const attachmentSchema = z.object({
  entityType: z.string().trim().min(1),
  entityId: z.string().trim().min(1),
  fileName: z.string().trim().min(1),
  fileUrl: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  fileSize: z.coerce.number().int().nonnegative(),
});

export async function createVaccination(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };
  const parsed = await parseOrFail(vaccinationSchema, rawData);
  if (!parsed.success) return parsed;

  const petId = await ensurePetAccess(actor, parsed.data.petId);
  if (!petId) return { success: false, error: 'Tidak diizinkan' };

  const parsedDate = parseDate(parsed.data.date);
  const nextDueDate = parseDate(parsed.data.nextDueDate);

  if (!parsedDate) {
    return { success: false, error: 'Tanggal vaksinasi tidak valid', fieldErrors: { date: ['Tanggal vaksinasi tidak valid'] } };
  }

  const item = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.vaccinationRecord.create({
      data: {
        petId,
        vaccineName: parsed.data.vaccineName.trim(),
        date: parsedDate,
        nextDueDate: nextDueDate ?? null,
        batchNumber: parsed.data.batchNumber?.trim() || null,
        veterinarian: parsed.data.veterinarian?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
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

export async function updateVaccination(id: string, rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };
  const parsed = await parseOrFail(vaccinationSchema, rawData);
  if (!parsed.success) return parsed;

  const petId = await ensurePetAccess(actor, parsed.data.petId);
  if (!petId) return { success: false, error: 'Tidak diizinkan' };

  const parsedDate = parseDate(parsed.data.date);
  const nextDueDate = parseDate(parsed.data.nextDueDate);

  if (!parsedDate) {
    return { success: false, error: 'Tanggal vaksinasi tidak valid', fieldErrors: { date: ['Tanggal vaksinasi tidak valid'] } };
  }

  const existing = await db.vaccinationRecord.findFirst({ where: { id, deletedAt: null }, select: { id: true, petId: true } });
  if (!existing || existing.petId !== petId) {
    return { success: false, error: 'Data vaksinasi tidak ditemukan' };
  }

  const item = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.vaccinationRecord.update({
      where: { id },
      data: {
        petId,
        vaccineName: parsed.data.vaccineName.trim(),
        date: parsedDate,
        nextDueDate: nextDueDate ?? null,
        batchNumber: parsed.data.batchNumber?.trim() || null,
        veterinarian: parsed.data.veterinarian?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        updatedBy: actor.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: 'UPDATE',
        entity: 'VaccinationRecord',
        entityId: updated.id,
        changes: parsed.data as Prisma.InputJsonValue,
      },
    });

    return updated;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: item.id } };
}

export async function softDeleteVaccination(id: string): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const existing = await db.vaccinationRecord.findFirst({ where: { id, deletedAt: null }, select: { id: true, petId: true } });
  if (!existing) return { success: false, error: 'Data vaksinasi tidak ditemukan' };

  const petId = await ensurePetAccess(actor, existing.petId);
  if (!petId) return { success: false, error: 'Tidak diizinkan' };

  const item = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.vaccinationRecord.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'SOFT_DELETE', entity: 'VaccinationRecord', entityId: updated.id, changes: { deletedAt: updated.deletedAt } as Prisma.InputJsonValue } });
    return updated;
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

  const petId = await ensurePetAccess(actor, parsed.data.petId);
  if (!petId) return { success: false, error: 'Tidak diizinkan' };

  const parsedDate = parseDate(parsed.data.date);
  if (!parsedDate) {
    return { success: false, error: 'Tanggal berat badan tidak valid', fieldErrors: { date: ['Tanggal berat badan tidak valid'] } };
  }

  const item = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.weightHistory.create({
      data: {
        petId,
        date: parsedDate,
        weight: parsed.data.weight,
        notes: parsed.data.notes?.trim() || null,
        createdBy: actor.id,
      },
    });

    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'WeightHistory', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
    return created;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: item.id } };
}

export async function updateWeight(id: string, rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };
  const parsed = await parseOrFail(weightSchema, rawData);
  if (!parsed.success) return parsed;

  const petId = await ensurePetAccess(actor, parsed.data.petId);
  if (!petId) return { success: false, error: 'Tidak diizinkan' };

  const parsedDate = parseDate(parsed.data.date);
  if (!parsedDate) {
    return { success: false, error: 'Tanggal berat badan tidak valid', fieldErrors: { date: ['Tanggal berat badan tidak valid'] } };
  }

  const existing = await db.weightHistory.findFirst({ where: { id, deletedAt: null }, select: { id: true, petId: true } });
  if (!existing || existing.petId !== petId) {
    return { success: false, error: 'Data berat badan tidak ditemukan' };
  }

  const item = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.weightHistory.update({ where: { id }, data: { petId, date: parsedDate, weight: parsed.data.weight, notes: parsed.data.notes?.trim() || null, updatedBy: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'WeightHistory', entityId: updated.id, changes: parsed.data as Prisma.InputJsonValue } });
    return updated;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: item.id } };
}

export async function softDeleteWeight(id: string): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const existing = await db.weightHistory.findFirst({ where: { id, deletedAt: null }, select: { id: true, petId: true } });
  if (!existing) return { success: false, error: 'Data berat badan tidak ditemukan' };

  const petId = await ensurePetAccess(actor, existing.petId);
  if (!petId) return { success: false, error: 'Tidak diizinkan' };

  const item = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.weightHistory.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'SOFT_DELETE', entity: 'WeightHistory', entityId: updated.id, changes: { deletedAt: updated.deletedAt } as Prisma.InputJsonValue } });
    return updated;
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

  const petId = await ensurePetAccess(actor, parsed.data.petId);
  if (!petId) return { success: false, error: 'Tidak diizinkan' };

  const item = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.allergy.create({
      data: {
        petId,
        allergen: parsed.data.allergen.trim(),
        severity: parsed.data.severity?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        createdBy: actor.id,
      },
    });

    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Allergy', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
    return created;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: item.id } };
}

export async function updateAllergy(id: string, rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };
  const parsed = await parseOrFail(allergySchema, rawData);
  if (!parsed.success) return parsed;

  const petId = await ensurePetAccess(actor, parsed.data.petId);
  if (!petId) return { success: false, error: 'Tidak diizinkan' };

  const existing = await db.allergy.findFirst({ where: { id, deletedAt: null }, select: { id: true, petId: true } });
  if (!existing || existing.petId !== petId) {
    return { success: false, error: 'Data alergi tidak ditemukan' };
  }

  const item = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.allergy.update({ where: { id }, data: { petId, allergen: parsed.data.allergen.trim(), severity: parsed.data.severity?.trim() || null, notes: parsed.data.notes?.trim() || null, updatedBy: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'Allergy', entityId: updated.id, changes: parsed.data as Prisma.InputJsonValue } });
    return updated;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: item.id } };
}

export async function softDeleteAllergy(id: string): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const existing = await db.allergy.findFirst({ where: { id, deletedAt: null }, select: { id: true, petId: true } });
  if (!existing) return { success: false, error: 'Data alergi tidak ditemukan' };

  const petId = await ensurePetAccess(actor, existing.petId);
  if (!petId) return { success: false, error: 'Tidak diizinkan' };

  const item = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.allergy.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'SOFT_DELETE', entity: 'Allergy', entityId: updated.id, changes: { deletedAt: updated.deletedAt } as Prisma.InputJsonValue } });
    return updated;
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

  const petId = await ensurePetAccess(actor, parsed.data.petId);
  if (!petId) return { success: false, error: 'Tidak diizinkan' };

  const parsedDiagnosedDate = parseDate(parsed.data.diagnosedDate);
  const resolvedDate = parseDate(parsed.data.resolvedDate);

  if (!parsedDiagnosedDate) {
    return { success: false, error: 'Tanggal diagnosa tidak valid', fieldErrors: { diagnosedDate: ['Tanggal diagnosa tidak valid'] } };
  }

  const item = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.diseaseHistory.create({ data: { petId, diseaseName: parsed.data.diseaseName.trim(), diagnosedDate: parsedDiagnosedDate, resolvedDate: resolvedDate ?? null, status: parsed.data.status?.trim() || 'ACTIVE', notes: parsed.data.notes?.trim() || null, createdBy: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'DiseaseHistory', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
    return created;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: item.id } };
}

export async function updateDisease(id: string, rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };
  const parsed = await parseOrFail(diseaseSchema, rawData);
  if (!parsed.success) return parsed;

  const petId = await ensurePetAccess(actor, parsed.data.petId);
  if (!petId) return { success: false, error: 'Tidak diizinkan' };

  const parsedDiagnosedDate = parseDate(parsed.data.diagnosedDate);
  const resolvedDate = parseDate(parsed.data.resolvedDate);
  if (!parsedDiagnosedDate) {
    return { success: false, error: 'Tanggal diagnosa tidak valid', fieldErrors: { diagnosedDate: ['Tanggal diagnosa tidak valid'] } };
  }

  const existing = await db.diseaseHistory.findFirst({ where: { id, deletedAt: null }, select: { id: true, petId: true } });
  if (!existing || existing.petId !== petId) {
    return { success: false, error: 'Data penyakit tidak ditemukan' };
  }

  const item = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.diseaseHistory.update({ where: { id }, data: { petId, diseaseName: parsed.data.diseaseName.trim(), diagnosedDate: parsedDiagnosedDate, resolvedDate: resolvedDate ?? null, status: parsed.data.status?.trim() || 'ACTIVE', notes: parsed.data.notes?.trim() || null, updatedBy: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'DiseaseHistory', entityId: updated.id, changes: parsed.data as Prisma.InputJsonValue } });
    return updated;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: item.id } };
}

export async function softDeleteDisease(id: string): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const existing = await db.diseaseHistory.findFirst({ where: { id, deletedAt: null }, select: { id: true, petId: true } });
  if (!existing) return { success: false, error: 'Data penyakit tidak ditemukan' };

  const petId = await ensurePetAccess(actor, existing.petId);
  if (!petId) return { success: false, error: 'Tidak diizinkan' };

  const item = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.diseaseHistory.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'SOFT_DELETE', entity: 'DiseaseHistory', entityId: updated.id, changes: { deletedAt: updated.deletedAt } as Prisma.InputJsonValue } });
    return updated;
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

  const petId = await ensurePetAccess(actor, parsed.data.entityId);
  if (!petId || parsed.data.entityType !== 'PET') return { success: false, error: 'Tidak diizinkan' };

  const item = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.attachment.create({
      data: {
        entityType: parsed.data.entityType,
        entityId: petId,
        fileName: parsed.data.fileName.trim(),
        fileUrl: parsed.data.fileUrl.trim(),
        mimeType: parsed.data.mimeType.trim(),
        fileSize: parsed.data.fileSize,
        createdBy: actor.id,
      },
    });

    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Attachment', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
    return created;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: item.id } };
}

export async function updateAttachment(id: string, rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };
  const parsed = await parseOrFail(attachmentSchema, rawData);
  if (!parsed.success) return parsed;

  const petId = await ensurePetAccess(actor, parsed.data.entityId);
  if (!petId || parsed.data.entityType !== 'PET') return { success: false, error: 'Tidak diizinkan' };

  const existing = await db.attachment.findFirst({ where: { id, deletedAt: null }, select: { id: true, entityId: true, entityType: true } });
  if (!existing || existing.entityType !== 'PET' || existing.entityId !== petId) {
    return { success: false, error: 'Lampiran tidak ditemukan' };
  }

  const item = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.attachment.update({ where: { id }, data: { entityType: parsed.data.entityType, entityId: petId, fileName: parsed.data.fileName.trim(), fileUrl: parsed.data.fileUrl.trim(), mimeType: parsed.data.mimeType.trim(), fileSize: parsed.data.fileSize, updatedBy: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'Attachment', entityId: updated.id, changes: parsed.data as Prisma.InputJsonValue } });
    return updated;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: item.id } };
}

export async function softDeleteAttachment(id: string): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const existing = await db.attachment.findFirst({ where: { id, deletedAt: null }, select: { id: true, entityId: true, entityType: true } });
  if (!existing || existing.entityType !== 'PET') return { success: false, error: 'Lampiran tidak ditemukan' };

  const petId = await ensurePetAccess(actor, existing.entityId);
  if (!petId) return { success: false, error: 'Tidak diizinkan' };

  const item = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.attachment.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'SOFT_DELETE', entity: 'Attachment', entityId: updated.id, changes: { deletedAt: updated.deletedAt } as Prisma.InputJsonValue } });
    return updated;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: item.id } };
}

export async function listMedicalHistory(petId: string) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const accessiblePetId = await ensurePetAccess(actor, petId);
  if (!accessiblePetId) return { success: false, error: 'Tidak diizinkan' };

  const [vaccinations, weights, allergies, diseases, attachments] = await Promise.all([
    db.vaccinationRecord.findMany({ where: { petId: accessiblePetId, deletedAt: null }, orderBy: { date: 'desc' } }),
    db.weightHistory.findMany({ where: { petId: accessiblePetId, deletedAt: null }, orderBy: { date: 'desc' } }),
    db.allergy.findMany({ where: { petId: accessiblePetId, deletedAt: null }, orderBy: { createdAt: 'desc' } }),
    db.diseaseHistory.findMany({ where: { petId: accessiblePetId, deletedAt: null }, orderBy: { diagnosedDate: 'desc' } }),
    db.attachment.findMany({ where: { entityId: accessiblePetId, entityType: 'PET', deletedAt: null }, orderBy: { createdAt: 'desc' } }),
  ]);

  return {
    success: true,
    data: { vaccinations, weights, allergies, diseases, attachments },
  };
}

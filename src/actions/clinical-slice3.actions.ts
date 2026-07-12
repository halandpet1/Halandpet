'use server';

import type { Prisma, UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { diagnosisSchema, treatmentPlanSchema, prescriptionSchema, followUpSchema } from '@/validators/clinical-slice3.schema';
import { parseOrFail, revalidateCustomerViews, requireRole, type ActionResult } from '@/lib/action-utils';
import { allocateFefoBatches } from '@/lib/inventory-utils';
import { logger } from '@/lib/logger';

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

export async function createDiagnosis(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(doctorRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(diagnosisSchema, rawData);
  if (!parsed.success) return parsed;

  const medicalRecord = await db.medicalRecord.findFirst({ where: { id: parsed.data.medicalRecordId, deletedAt: null }, select: { id: true, appointmentId: true, status: true } });
  if (!medicalRecord) return { success: false, error: 'Rekam medis tidak ditemukan' };

  const existing = await db.diagnosis.findFirst({ where: { medicalRecordId: parsed.data.medicalRecordId, deletedAt: null }, select: { id: true } });
  if (existing) return { success: false, error: 'Diagnosis sudah ada untuk rekam medis ini' };

  try {
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.diagnosis.create({
        data: {
          medicalRecordId: parsed.data.medicalRecordId,
          doctorId: actor.id,
          primaryDiagnosis: parsed.data.primaryDiagnosis?.trim() || null,
          secondaryDiagnosis: parsed.data.secondaryDiagnosis?.trim() || null,
          differentialDiagnosis: parsed.data.differentialDiagnosis?.trim() || null,
          clinicalNotes: parsed.data.clinicalNotes?.trim() || null,
          isLocked: parsed.data.isLocked ?? false,
          lockedAt: parsed.data.isLocked ? new Date() : null,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });

      await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Diagnosis', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
      return created;
    });

    await revalidateCustomerViews();
    return { success: true, data: { id: result.id } };
  } catch (error) {
    logger.error('createDiagnosis failed', { action: 'createDiagnosis', error });
    return { success: false, error: 'Terjadi kesalahan, coba lagi' };
  }
}

export async function updateDiagnosis(id: string, rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(doctorRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(diagnosisSchema, rawData);
  if (!parsed.success) return parsed;

  const existing = await db.diagnosis.findFirst({ where: { id, deletedAt: null }, select: { id: true, isLocked: true } });
  if (!existing) return { success: false, error: 'Diagnosis tidak ditemukan' };
  if (existing.isLocked) return { success: false, error: 'Diagnosis sudah terkunci' };

  try {
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.diagnosis.update({
        where: { id },
        data: {
          primaryDiagnosis: parsed.data.primaryDiagnosis?.trim() || null,
          secondaryDiagnosis: parsed.data.secondaryDiagnosis?.trim() || null,
          differentialDiagnosis: parsed.data.differentialDiagnosis?.trim() || null,
          clinicalNotes: parsed.data.clinicalNotes?.trim() || null,
          isLocked: parsed.data.isLocked ?? false,
          lockedAt: parsed.data.isLocked ? new Date() : null,
          updatedBy: actor.id,
        },
      });

      await tx.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'Diagnosis', entityId: updated.id, changes: parsed.data as Prisma.InputJsonValue } });
      return updated;
    });

    await revalidateCustomerViews();
    return { success: true, data: { id: result.id } };
  } catch (error) {
    logger.error('updateDiagnosis failed', { action: 'updateDiagnosis', error });
    return { success: false, error: 'Terjadi kesalahan, coba lagi' };
  }
}

export async function createTreatmentPlan(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(doctorRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(treatmentPlanSchema, rawData);
  if (!parsed.success) return parsed;

  const diagnosis = await db.diagnosis.findFirst({ where: { medicalRecordId: parsed.data.medicalRecordId, deletedAt: null }, select: { id: true, isLocked: true } });
  if (!diagnosis) return { success: false, error: 'Treatment plan memerlukan diagnosis' };
  if (!diagnosis.isLocked) return { success: false, error: 'Diagnosis harus terkunci sebelum treatment plan' };

  const existing = await db.treatmentPlan.findFirst({ where: { medicalRecordId: parsed.data.medicalRecordId, deletedAt: null }, select: { id: true } });
  if (existing) return { success: false, error: 'Treatment plan sudah ada untuk rekam medis ini' };

  try {
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.treatmentPlan.create({
        data: {
          medicalRecordId: parsed.data.medicalRecordId,
          doctorId: actor.id,
          medicalTreatment: parsed.data.medicalTreatment?.trim() || null,
          procedure: parsed.data.procedure?.trim() || null,
          observation: parsed.data.observation?.trim() || null,
          hospitalizationRecommendation: parsed.data.hospitalizationRecommendation?.trim() || null,
          followUpRecommendation: parsed.data.followUpRecommendation?.trim() || null,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });

      await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'TreatmentPlan', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
      return created;
    });

    await revalidateCustomerViews();
    return { success: true, data: { id: result.id } };
  } catch (error) {
    logger.error('createTreatmentPlan failed', { action: 'createTreatmentPlan', error });
    return { success: false, error: 'Terjadi kesalahan, coba lagi' };
  }
}

export async function updatePrescriptionQueueStatus(id: string, queueStatus: string): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(doctorRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const existing = await db.prescription.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true } });
  if (!existing) return { success: false, error: 'Resep tidak ditemukan' };

  try {
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.prescription.update({ where: { id }, data: { queueStatus, queueUpdatedAt: new Date(), updatedBy: actor.id } });
      await tx.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'Prescription', entityId: updated.id, changes: { queueStatus } as Prisma.InputJsonValue } });
      return updated;
    });

    await revalidateCustomerViews();
    return { success: true, data: { id: result.id } };
  } catch (error) {
    logger.error('updatePrescriptionQueueStatus failed', { action: 'updatePrescriptionQueueStatus', error });
    return { success: false, error: 'Terjadi kesalahan, coba lagi' };
  }
}

export async function createPrescription(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(doctorRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(prescriptionSchema, rawData);
  if (!parsed.success) return parsed;

  const diagnosis = await db.diagnosis.findFirst({ where: { id: parsed.data.diagnosisId, deletedAt: null }, select: { id: true, medicalRecordId: true, isLocked: true } });
  if (!diagnosis) return { success: false, error: 'Diagnosis tidak ditemukan' };
  if (!diagnosis.isLocked) return { success: false, error: 'Diagnosis harus terkunci sebelum resep dibuat' };

  const product = await db.product.findFirst({ where: { id: parsed.data.productId, deletedAt: null, isActive: true }, select: { id: true, name: true, requiresBatch: true, currentQty: true } });
  if (!product) return { success: false, error: 'Obat tidak ditemukan' };

  const batches = product.requiresBatch
    ? await db.inventoryBatch.findMany({ where: { productId: product.id, deletedAt: null, currentQty: { gt: 0 } }, select: { id: true, currentQty: true, expiryDate: true }, orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }] })
    : [];

  const allocations = product.requiresBatch ? allocateFefoBatches(batches, parsed.data.quantity) : [];

  if (product.requiresBatch && (!allocations.length || allocations.reduce((sum: number, allocation: { qty: number }) => sum + allocation.qty, 0) < parsed.data.quantity)) {
    return { success: false, error: 'Stok obat tidak mencukupi' };
  }

  if (!product.requiresBatch && product.currentQty < parsed.data.quantity) {
    return { success: false, error: 'Stok obat tidak mencukupi' };
  }

  try {
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.prescription.create({
        data: {
          medicalRecordId: diagnosis.medicalRecordId,
          diagnosisId: diagnosis.id,
          doctorId: actor.id,
          productId: product.id,
          inventoryBatchId: allocations[0]?.id ?? null,
          medicine: parsed.data.medicine.trim(),
          dosage: parsed.data.dosage?.trim() || null,
          frequency: parsed.data.frequency?.trim() || null,
          duration: parsed.data.duration?.trim() || null,
          instructions: parsed.data.instructions?.trim() || null,
          quantity: parsed.data.quantity,
          refill: parsed.data.refill,
          warnings: parsed.data.warnings?.trim() || null,
          status: parsed.data.status,
          queueStatus: 'WAITING',
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });

      if (product.requiresBatch && allocations.length) {
        await tx.product.update({ where: { id: product.id }, data: { currentQty: { decrement: parsed.data.quantity }, updatedAt: new Date() } });

        for (const allocation of allocations) {
          const batch = batches.find((candidate) => candidate.id === allocation.id);
          if (!batch) continue;
          const updatedBatch = await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: { currentQty: batch.currentQty - allocation.qty, updatedAt: new Date() },
          });

          await tx.stockMovement.create({
            data: {
              productId: product.id,
              batchId: batch.id,
              type: 'OUT',
              refType: 'MEDICAL',
              refId: created.id,
              qty: -allocation.qty,
              balanceAfter: updatedBatch.currentQty,
              notes: `Resep ${parsed.data.medicine}`,
              createdBy: actor.id,
            },
          });
        }
      } else if (!product.requiresBatch) {
        await tx.product.update({ where: { id: product.id }, data: { currentQty: product.currentQty - parsed.data.quantity, updatedAt: new Date() } });
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            batchId: null,
            type: 'OUT',
            refType: 'MEDICAL',
            refId: created.id,
            qty: parsed.data.quantity,
            balanceAfter: product.currentQty - parsed.data.quantity,
            notes: `Resep ${parsed.data.medicine}`,
            createdBy: actor.id,
          },
        });
      }

      await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Prescription', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
      return created;
    });

    await revalidateCustomerViews();
    return { success: true, data: { id: result.id } };
  } catch (error) {
    logger.error('createPrescription failed', { action: 'createPrescription', error });
    return { success: false, error: 'Terjadi kesalahan, coba lagi' };
  }
}

export async function createFollowUp(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(doctorRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(followUpSchema, rawData);
  if (!parsed.success) return parsed;

  const medicalRecord = await db.medicalRecord.findFirst({ where: { id: parsed.data.medicalRecordId, deletedAt: null }, select: { id: true, appointmentId: true } });
  if (!medicalRecord) return { success: false, error: 'Rekam medis tidak ditemukan' };

  const appointment = await db.appointment.findFirst({ where: { id: medicalRecord.appointmentId, deletedAt: null }, select: { id: true, status: true } });
  if (!appointment || appointment.status !== 'COMPLETED') return { success: false, error: 'Follow up memerlukan konsultasi yang selesai' };

  const diagnosis = await db.diagnosis.findFirst({ where: { medicalRecordId: parsed.data.medicalRecordId, deletedAt: null, isLocked: true }, select: { id: true } });
  if (!diagnosis) return { success: false, error: 'Follow up memerlukan diagnosis yang selesai' };

  const nextVisitDate = parseDate(parsed.data.nextVisitDate);

  try {
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.followUp.create({
        data: {
          medicalRecordId: parsed.data.medicalRecordId,
          doctorId: actor.id,
          nextVisitDate: nextVisitDate ?? null,
          reminder: parsed.data.reminder?.trim() || null,
          reason: parsed.data.reason?.trim() || null,
          status: parsed.data.status?.trim() || 'SCHEDULED',
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });

      await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'FollowUp', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
      return created;
    });

    await revalidateCustomerViews();
    return { success: true, data: { id: result.id } };
  } catch (error) {
    logger.error('createFollowUp failed', { action: 'createFollowUp', error });
    return { success: false, error: 'Terjadi kesalahan, coba lagi' };
  }
}

export async function getSlice3ClinicalData(medicalRecordId: string) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(staffViewRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const medicalRecord = await db.medicalRecord.findFirst({ where: { id: medicalRecordId, deletedAt: null }, select: { id: true } });
  if (!medicalRecord) return { success: false, error: 'Rekam medis tidak ditemukan' };

  const [diagnosis, treatmentPlan, prescriptions, followUps] = await Promise.all([
    db.diagnosis.findFirst({ where: { medicalRecordId, deletedAt: null }, include: { doctor: { select: { id: true, fullName: true } } } }),
    db.treatmentPlan.findFirst({ where: { medicalRecordId, deletedAt: null }, include: { doctor: { select: { id: true, fullName: true } } } }),
    db.prescription.findMany({ where: { medicalRecordId, deletedAt: null }, orderBy: { createdAt: 'desc' }, include: { diagnosis: true, product: true, inventoryBatch: true, doctor: { select: { id: true, fullName: true } } } }),
    db.followUp.findMany({ where: { medicalRecordId, deletedAt: null }, orderBy: { nextVisitDate: 'asc' } }),
  ]);

  return { success: true, data: { diagnosis, treatmentPlan, prescriptions, followUps } };
}

'use server';

import { Prisma, type UserRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { parseOrFail, type ActionResult } from '@/lib/action-utils';
import { productSchema, purchaseOrderSchema, stockAdjustmentSchema, stockOpnameSchema } from '@/validators/inventory.schema';
import { selectFefoBatch } from '@/lib/inventory-utils';

const inventoryRoles: UserRole[] = ['OWNER', 'ADMIN', 'DOCTOR', 'STAFF'];
const approvalRoles: UserRole[] = ['OWNER', 'ADMIN'];

async function assertRole(allowedRoles: UserRole[]) {
  if (!db) return null;
  const user = await getSessionUser();
  if (!user) return null;

  const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { id: true, role: true, isActive: true, deletedAt: true } });
  if (!dbUser || dbUser.deletedAt || !dbUser.isActive || !allowedRoles.includes(dbUser.role)) {
    return null;
  }

  return { id: dbUser.id, role: dbUser.role, fullName: user.fullName };
}

async function logAudit(userId: string | null, action: string, entity: string, entityId: string, changes: Prisma.InputJsonValue) {
  if (!db) return;
  await db.auditLog.create({ data: { userId, action, entity, entityId, changes } });
}

function parseDate(value: string | undefined | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function createProduct(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(productSchema, rawData);
  if (!parsed.success) return parsed;

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.product.create({
      data: {
        sku: parsed.data.sku.trim(),
        name: parsed.data.name.trim(),
        type: parsed.data.type,
        unit: parsed.data.unit.trim(),
        currentQty: parsed.data.initialQty,
        reorderLevel: parsed.data.reorderLevel,
        basePrice: parsed.data.basePrice,
        costPrice: parsed.data.costPrice,
        requiresBatch: parsed.data.requiresBatch,
        isActive: parsed.data.isActive,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });

    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Product', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
    return created;
  });

  revalidatePath('/inventory');
  return { success: true, data: { id: result.id } };
}

export async function listProducts(params?: { page?: number; pageSize?: number; search?: string }) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  const search = params?.search?.trim();

  const where = {
    deletedAt: null,
    ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { sku: { contains: search, mode: 'insensitive' as const } }] } : {}),
  };

  const [items, total] = await Promise.all([
    db.product.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, sku: true, name: true, type: true, unit: true, currentQty: true, reorderLevel: true, basePrice: true, costPrice: true, requiresBatch: true, isActive: true, createdAt: true } }),
    db.product.count({ where }),
  ]);

  return { success: true, data: { items, total, page, pageSize } };
}

export async function createPurchaseOrder(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(purchaseOrderSchema, rawData);
  if (!parsed.success) return parsed;

  const expectedDate = parseDate(parsed.data.expectedDate);
  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const order = await tx.purchaseOrder.create({
      data: {
        poNumber: `PO-${Date.now()}`,
        supplierName: parsed.data.supplierName.trim(),
        status: 'DRAFT',
        orderDate: new Date(),
        expectedDate: expectedDate ?? null,
        total: parsed.data.unitPrice * parsed.data.qty,
        createdBy: actor.id,
      },
    });

    await tx.purchaseOrderItem.create({ data: { purchaseOrderId: order.id, productId: parsed.data.productId, qty: parsed.data.qty, unitPrice: parsed.data.unitPrice, total: parsed.data.unitPrice * parsed.data.qty } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'PurchaseOrder', entityId: order.id, changes: parsed.data as Prisma.InputJsonValue } });
    return order;
  });

  revalidatePath('/inventory');
  return { success: true, data: { id: result.id } };
}

export async function createStockAdjustment(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(approvalRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(stockAdjustmentSchema, rawData);
  if (!parsed.success) return parsed;

  const product = await db.product.findFirst({ where: { id: parsed.data.productId, deletedAt: null }, select: { id: true, currentQty: true, requiresBatch: true } });
  if (!product) return { success: false, error: 'Produk tidak ditemukan' };

  const nextQty = product.currentQty + parsed.data.delta;
  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.product.update({ where: { id: product.id }, data: { currentQty: nextQty, updatedAt: new Date() } });
    await tx.stockMovement.create({ data: { productId: product.id, batchId: null, type: 'ADJUSTMENT', refType: 'ADJUSTMENT', refId: `adjust-${Date.now()}`, qty: parsed.data.delta, balanceAfter: updated.currentQty, notes: parsed.data.notes, createdBy: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'StockAdjustment', entityId: updated.id, changes: { ...parsed.data, delta: parsed.data.delta } as Prisma.InputJsonValue } });
    return updated;
  });

  revalidatePath('/inventory');
  return { success: true, data: { id: result.id } };
}

export async function createStockOpname(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(approvalRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(stockOpnameSchema, rawData);
  if (!parsed.success) return parsed;

  const product = await db.product.findFirst({ where: { id: parsed.data.productId, deletedAt: null }, select: { id: true, currentQty: true } });
  if (!product) return { success: false, error: 'Produk tidak ditemukan' };

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.product.update({ where: { id: product.id }, data: { currentQty: product.currentQty + parsed.data.delta, updatedAt: new Date() } });
    await tx.stockMovement.create({ data: { productId: product.id, batchId: null, type: 'OPNAME', refType: 'OPNAME', refId: `opname-${Date.now()}`, qty: parsed.data.delta, balanceAfter: updated.currentQty, notes: parsed.data.notes, createdBy: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'StockOpname', entityId: updated.id, changes: parsed.data as Prisma.InputJsonValue } });
    return updated;
  });

  revalidatePath('/inventory');
  return { success: true, data: { id: result.id } };
}

export async function createDispensing(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(stockAdjustmentSchema, rawData);
  if (!parsed.success) return parsed;

  const product = await db.product.findFirst({ where: { id: parsed.data.productId, deletedAt: null, isActive: true }, select: { id: true, name: true, requiresBatch: true, currentQty: true } });
  if (!product) return { success: false, error: 'Produk tidak ditemukan' };

  const batch = product.requiresBatch ? selectFefoBatch((await db.inventoryBatch.findMany({ where: { productId: product.id, deletedAt: null, currentQty: { gt: 0 } }, select: { id: true, currentQty: true, expiryDate: true } })) as Array<{ id: string; currentQty: number; expiryDate: Date | null }>, Math.abs(parsed.data.delta)) : null;
  if (product.requiresBatch && (!batch || batch.currentQty < Math.abs(parsed.data.delta))) {
    return { success: false, error: 'Stok obat tidak mencukupi' };
  }

  if (!product.requiresBatch && product.currentQty < Math.abs(parsed.data.delta)) {
    return { success: false, error: 'Stok obat tidak mencukupi' };
  }

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    if (product.requiresBatch && batch) {
      const updatedBatch = await tx.inventoryBatch.update({ where: { id: batch.id }, data: { currentQty: batch.currentQty - Math.abs(parsed.data.delta), updatedAt: new Date() } });
      await tx.stockMovement.create({ data: { productId: product.id, batchId: batch.id, type: 'OUT', refType: 'MEDICAL', refId: `dispense-${Date.now()}`, qty: Math.abs(parsed.data.delta), balanceAfter: updatedBatch.currentQty, notes: parsed.data.notes, createdBy: actor.id } });
    } else if (!product.requiresBatch) {
      const updatedProduct = await tx.product.update({ where: { id: product.id }, data: { currentQty: product.currentQty - Math.abs(parsed.data.delta), updatedAt: new Date() } });
      await tx.stockMovement.create({ data: { productId: product.id, batchId: null, type: 'OUT', refType: 'MEDICAL', refId: `dispense-${Date.now()}`, qty: Math.abs(parsed.data.delta), balanceAfter: updatedProduct.currentQty, notes: parsed.data.notes, createdBy: actor.id } });
    }

    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Dispensing', entityId: product.id, changes: parsed.data as Prisma.InputJsonValue } });
    return { id: product.id };
  });

  revalidatePath('/inventory');
  return { success: true, data: result };
}

export async function listInventoryMovements(params?: { page?: number; pageSize?: number; search?: string }) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  const search = params?.search?.trim();

  const where = {
    ...(search ? { OR: [{ notes: { contains: search, mode: 'insensitive' as const } }, { product: { name: { contains: search, mode: 'insensitive' as const } } }] } : {}),
  };

  const [items, total] = await Promise.all([
    db.stockMovement.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { product: { select: { id: true, name: true } }, batch: { select: { id: true, batchNo: true } } } }),
    db.stockMovement.count({ where }),
  ]);

  return { success: true, data: { items, total, page, pageSize } };
}

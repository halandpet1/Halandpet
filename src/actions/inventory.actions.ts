'use server';

import type { Prisma, UserRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { parseOrFail, requireRole, type ActionResult } from '@/lib/action-utils';
import { disposalSchema, goodsReceiptSchema, productSchema, purchaseOrderSchema, purchaseRequestSchema, stockAdjustmentSchema, stockOpnameSchema, stockReturnSchema, supplierInvoiceSchema, supplierPaymentSchema, supplierSchema, warehouseSchema, warehouseTransferSchema } from '@/validators/inventory.schema';
import { allocateFefoBatches } from '@/lib/inventory-utils';
import { checkRateLimit } from '@/lib/rate-limit';

const inventoryRoles: UserRole[] = ['OWNER', 'ADMIN', 'DOCTOR', 'STAFF'];
const approvalRoles: UserRole[] = ['OWNER', 'ADMIN'];

async function assertRole(allowedRoles: UserRole[]) {
  return requireRole(allowedRoles);
}

async function assertRateLimit(actorId: string, scope: string) {
  const result = await checkRateLimit(`inventory:${actorId}:${scope}`, { max: 20, windowMs: 60_000 });
  if (!result.allowed) {
    return { success: false as const, error: `Terlalu banyak permintaan. Coba lagi dalam ${Math.ceil(result.retryAfterMs / 1000)} detik.` };
  }

  return null;
}

async function decrementProductStock(tx: Prisma.TransactionClient, productId: string, qty: number) {
  const updated = await tx.product.updateMany({
    where: { id: productId, currentQty: { gte: qty } },
    data: { currentQty: { decrement: qty } },
  });

  if (updated.count === 0) {
    throw new Error('Stok obat tidak mencukupi');
  }

  return updated;
}

async function incrementProductStock(tx: Prisma.TransactionClient, productId: string, qty: number) {
  return tx.product.updateMany({
    where: { id: productId },
    data: { currentQty: { increment: qty } },
  });
}

async function decrementBatchStock(tx: Prisma.TransactionClient, batchId: string, qty: number) {
  const updated = await tx.inventoryBatch.updateMany({
    where: { id: batchId, currentQty: { gte: qty } },
    data: { currentQty: { decrement: qty } },
  });

  if (updated.count === 0) {
    throw new Error('Stok batch tidak mencukupi');
  }

  return updated;
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

  const rateLimited = await assertRateLimit(actor.id, 'create-product');
  if (rateLimited) return rateLimited;

  const parsed = await parseOrFail(productSchema, rawData);
  if (!parsed.success) return parsed;

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.product.create({
      data: {
        sku: parsed.data.sku.trim(),
        name: parsed.data.name.trim(),
        type: parsed.data.type,
        unit: parsed.data.unit.trim(),
        barcode: parsed.data.barcode?.trim() || null,
        category: parsed.data.category?.trim() || null,
        brand: parsed.data.brand?.trim() || null,
        currentQty: parsed.data.initialQty,
        minStock: parsed.data.minStock,
        maxStock: parsed.data.maxStock,
        reorderLevel: parsed.data.reorderLevel,
        basePrice: parsed.data.basePrice,
        costPrice: parsed.data.costPrice,
        sellingPrice: parsed.data.sellingPrice,
        taxRate: parsed.data.taxRate,
        requiresBatch: parsed.data.requiresBatch,
        isActive: parsed.data.isActive,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });

    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Product', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
    return created;
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/inventory');
  }
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

export async function createSupplier(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const rateLimited = await assertRateLimit(actor.id, 'create-supplier');
  if (rateLimited) return rateLimited;

  const parsed = await parseOrFail(supplierSchema, rawData);
  if (!parsed.success) return parsed;

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.supplier.create({ data: { name: parsed.data.name.trim(), contactPerson: parsed.data.contactPerson || null, phone: parsed.data.phone || null, email: parsed.data.email || null, address: parsed.data.address || null, paymentTerm: parsed.data.paymentTerm || null, creditLimit: parsed.data.creditLimit, status: parsed.data.status } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Supplier', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
    return created;
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/inventory');
  }
  return { success: true, data: { id: result.id } };
}

export async function createWarehouse(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const rateLimited = await assertRateLimit(actor.id, 'create-warehouse');
  if (rateLimited) return rateLimited;

  const parsed = await parseOrFail(warehouseSchema, rawData);
  if (!parsed.success) return parsed;

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.warehouse.create({ data: { name: parsed.data.name.trim(), code: parsed.data.code.trim(), location: parsed.data.location || null, isDefault: parsed.data.isDefault, isActive: parsed.data.isActive } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Warehouse', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
    return created;
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/inventory');
  }
  return { success: true, data: { id: result.id } };
}

export async function createPurchaseRequest(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const rateLimited = await assertRateLimit(actor.id, 'create-purchase-request');
  if (rateLimited) return rateLimited;

  const parsed = await parseOrFail(purchaseRequestSchema, rawData);
  if (!parsed.success) return parsed;

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.purchaseRequest.create({ data: { requestNo: `PR-${Date.now()}`, productId: parsed.data.productId, warehouseId: parsed.data.warehouseId || null, qty: parsed.data.qty, priority: parsed.data.priority, requestedBy: parsed.data.requestedBy || actor.fullName, notes: parsed.data.notes || null, status: 'PENDING' } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'PurchaseRequest', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
    return created;
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/inventory');
  }
  return { success: true, data: { id: result.id } };
}

export async function createPurchaseOrder(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const rateLimited = await assertRateLimit(actor.id, 'create-purchase-order');
  if (rateLimited) return rateLimited;

  const parsed = await parseOrFail(purchaseOrderSchema, rawData);
  if (!parsed.success) return parsed;

  const expectedDate = parseDate(parsed.data.expectedDate);
  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const supplierName = parsed.data.supplierName?.trim() || 'Supplier belum ditentukan';
    const order = await tx.purchaseOrder.create({
      data: {
        poNumber: `PO-${Date.now()}`,
        supplierId: parsed.data.supplierId || null,
        warehouseId: parsed.data.warehouseId || null,
        supplierName,
        status: 'DRAFT',
        orderDate: new Date(),
        expectedDate: expectedDate ?? null,
        requestedBy: parsed.data.requestedBy || actor.fullName,
        notes: parsed.data.notes || null,
        total: parsed.data.unitPrice * parsed.data.qty,
      },
    });

    await tx.purchaseOrderItem.create({ data: { purchaseOrderId: order.id, productId: parsed.data.productId, qty: parsed.data.qty, unitPrice: parsed.data.unitPrice, total: parsed.data.unitPrice * parsed.data.qty } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'PurchaseOrder', entityId: order.id, changes: parsed.data as Prisma.InputJsonValue } });
    return order;
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/inventory');
  }
  return { success: true, data: { id: result.id } };
}

export async function createGoodsReceipt(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const rateLimited = await assertRateLimit(actor.id, 'create-goods-receipt');
  if (rateLimited) return rateLimited;

  const parsed = await parseOrFail(goodsReceiptSchema, rawData);
  if (!parsed.success) return parsed;

  try {
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const purchaseOrder = await tx.purchaseOrder.findUnique({ where: { id: parsed.data.purchaseOrderId }, select: { id: true, warehouseId: true, supplierName: true } });
      if (!purchaseOrder) {
        throw new Error('Purchase order tidak ditemukan');
      }

      const receipt = await tx.goodsReceipt.create({
        data: {
          receiptNo: `GR-${Date.now()}`,
          purchaseOrderId: purchaseOrder.id,
          warehouseId: parsed.data.warehouseId || purchaseOrder.warehouseId || null,
          receivedBy: parsed.data.receivedBy || actor.fullName,
          notes: parsed.data.notes || null,
          status: 'RECEIVED',
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });

      for (const item of parsed.data.items) {
        const product = await tx.product.findFirst({ where: { id: item.productId, deletedAt: null }, select: { id: true, currentQty: true, requiresBatch: true, costPrice: true } });
        if (!product) {
          throw new Error(`Produk tidak ditemukan: ${item.productId}`);
        }

        await incrementProductStock(tx, product.id, item.qty);
        const updatedProduct = await tx.product.findFirst({ where: { id: product.id }, select: { currentQty: true } });
        const nextQty = updatedProduct?.currentQty ?? product.currentQty + item.qty;

        if (product.requiresBatch) {
          await tx.inventoryBatch.create({
            data: {
              productId: product.id,
              batchNo: item.batchNo?.trim() || `BATCH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              quantity: item.qty,
              currentQty: item.qty,
              costPrice: item.unitPrice,
              warehouseId: parsed.data.warehouseId || purchaseOrder.warehouseId || null,
            },
          });
        }

        await tx.goodsReceiptItem.create({
          data: {
            goodsReceiptId: receipt.id,
            productId: product.id,
            qty: item.qty,
            unitPrice: item.unitPrice,
            batchNo: item.batchNo?.trim() || null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            notes: item.notes || null,
          },
        });

        await tx.stockMovement.create({ data: { productId: product.id, batchId: null, warehouseId: parsed.data.warehouseId || purchaseOrder.warehouseId || null, type: 'IN', refType: 'PURCHASE', refId: receipt.id, qty: item.qty, balanceAfter: nextQty, notes: item.notes || null, createdBy: actor.id } });
      }

      await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'GoodsReceipt', entityId: receipt.id, changes: parsed.data as Prisma.InputJsonValue } });
      return { id: receipt.id };
    });

    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
      revalidatePath('/inventory');
    }

    return { success: true, data: { id: result.id } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal membuat goods receipt' };
  }
}

export async function createSupplierInvoice(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const rateLimited = await assertRateLimit(actor.id, 'create-supplier-invoice');
  if (rateLimited) return rateLimited;

  const parsed = await parseOrFail(supplierInvoiceSchema, rawData);
  if (!parsed.success) return parsed;

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const invoice = await tx.supplierInvoice.create({
      data: {
        invoiceNo: `SI-${Date.now()}`,
        supplierId: parsed.data.supplierId || null,
        purchaseOrderId: parsed.data.purchaseOrderId || null,
        status: 'OPEN',
        dueDate: parseDate(parsed.data.dueDate),
        subtotal: parsed.data.subtotal,
        tax: parsed.data.tax,
        discount: parsed.data.discount,
        total: parsed.data.total,
        paidAmount: 0,
        supplierName: parsed.data.supplierName.trim(),
        notes: parsed.data.notes || null,
      },
    });

    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'SupplierInvoice', entityId: invoice.id, changes: parsed.data as Prisma.InputJsonValue } });
    return invoice;
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/inventory');
  }
  return { success: true, data: { id: result.id } };
}

export async function createSupplierPayment(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const rateLimited = await assertRateLimit(actor.id, 'create-supplier-payment');
  if (rateLimited) return rateLimited;

  const parsed = await parseOrFail(supplierPaymentSchema, rawData);
  if (!parsed.success) return parsed;

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const payment = await tx.supplierPayment.create({
      data: {
        supplierInvoiceId: parsed.data.supplierInvoiceId,
        supplierId: parsed.data.supplierId || null,
        amount: parsed.data.amount,
        method: parsed.data.method,
        referenceNo: parsed.data.referenceNo || null,
        status: 'SUCCESS',
        createdBy: actor.id,
      },
    });

    const invoice = await tx.supplierInvoice.findUnique({ where: { id: parsed.data.supplierInvoiceId }, select: { id: true, total: true, paidAmount: true, status: true } });
    if (invoice) {
      const nextPaidAmount = Number(invoice.paidAmount) + parsed.data.amount;
      const nextStatus = nextPaidAmount >= Number(invoice.total) ? 'PAID' : 'PARTIAL';
      await tx.supplierInvoice.update({ where: { id: invoice.id }, data: { paidAmount: nextPaidAmount, status: nextStatus, updatedAt: new Date() } });
    }

    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'SupplierPayment', entityId: payment.id, changes: parsed.data as Prisma.InputJsonValue } });
    return payment;
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/inventory');
  }
  return { success: true, data: { id: result.id } };
}

export async function createWarehouseTransfer(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const rateLimited = await assertRateLimit(actor.id, 'create-warehouse-transfer');
  if (rateLimited) return rateLimited;

  const parsed = await parseOrFail(warehouseTransferSchema, rawData);
  if (!parsed.success) return parsed;

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const transfer = await tx.warehouseTransfer.create({ data: { transferNo: `TR-${Date.now()}`, fromWarehouseId: parsed.data.fromWarehouseId, toWarehouseId: parsed.data.toWarehouseId, status: 'REQUESTED', requestedBy: parsed.data.requestedBy || actor.fullName, notes: parsed.data.notes || null, createdAt: new Date() } });
    for (const item of parsed.data.items) {
      await tx.warehouseTransferItem.create({ data: { transferId: transfer.id, productId: item.productId, qty: item.qty, batchNo: item.batchNo || null, notes: item.notes || null } });
    }
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'WarehouseTransfer', entityId: transfer.id, changes: parsed.data as Prisma.InputJsonValue } });
    return transfer;
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/inventory');
  }
  return { success: true, data: { id: result.id } };
}

export async function createStockReturn(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(stockReturnSchema, rawData);
  if (!parsed.success) return parsed;

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.stockReturn.create({ data: { returnNo: `RT-${Date.now()}`, type: parsed.data.type, productId: parsed.data.productId, warehouseId: parsed.data.warehouseId || null, batchId: parsed.data.batchId || null, qty: parsed.data.qty, reason: parsed.data.reason, status: 'REQUESTED', requestedBy: parsed.data.requestedBy || actor.fullName, notes: parsed.data.notes || null } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'StockReturn', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
    return created;
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/inventory');
  }
  return { success: true, data: { id: result.id } };
}

export async function updateWarehouseTransferStatus(rawData: { id: string; status: string; notes?: string }): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(approvalRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const existing = await db.warehouseTransfer.findUnique({ where: { id: rawData.id }, select: { id: true, status: true, fromWarehouseId: true, toWarehouseId: true, items: true } });
  if (!existing) return { success: false, error: 'Transfer tidak ditemukan' };

  let result;
  try {
    result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.warehouseTransfer.update({ where: { id: rawData.id }, data: { status: rawData.status, approvedBy: actor.id, notes: rawData.notes ?? null, updatedAt: new Date() } });

      if (rawData.status === 'APPROVED') {
        for (const item of existing.items) {
          const product = await tx.product.findFirst({ where: { id: item.productId, deletedAt: null }, select: { id: true, currentQty: true, requiresBatch: true } });
          if (!product) {
            throw new Error(`Produk tidak ditemukan: ${item.productId}`);
          }
          await decrementProductStock(tx, product.id, item.qty);
          const updatedProduct = await tx.product.findFirst({ where: { id: product.id }, select: { currentQty: true } });
          const nextQty = updatedProduct?.currentQty ?? Math.max(0, product.currentQty - item.qty);
          await tx.stockMovement.create({ data: { productId: product.id, batchId: null, warehouseId: existing.fromWarehouseId ?? null, type: 'OUT', refType: 'TRANSFER', refId: updated.id, qty: -item.qty, balanceAfter: nextQty, notes: rawData.notes ?? null, createdBy: actor.id } });
          await tx.stockMovement.create({ data: { productId: product.id, batchId: null, warehouseId: existing.toWarehouseId ?? null, type: 'IN', refType: 'TRANSFER', refId: updated.id, qty: item.qty, balanceAfter: nextQty + item.qty, notes: rawData.notes ?? null, createdBy: actor.id } });
        }
      }

      await tx.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'WarehouseTransfer', entityId: updated.id, changes: { status: rawData.status, notes: rawData.notes ?? null } as Prisma.InputJsonValue } });
      return updated;
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal memperbarui transfer' };
  }

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/inventory');
  }
  return { success: true, data: { id: result.id } };
}

export async function updateStockReturnStatus(rawData: { id: string; status: string; notes?: string }): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(approvalRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const existing = await db.stockReturn.findUnique({ where: { id: rawData.id }, select: { id: true, productId: true, warehouseId: true, batchId: true, qty: true, status: true, type: true } });
  if (!existing) return { success: false, error: 'Return tidak ditemukan' };

  let result;
  try {
    result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.stockReturn.update({ where: { id: rawData.id }, data: { status: rawData.status, approvedBy: actor.id, notes: rawData.notes ?? null, updatedAt: new Date() } });

      if (rawData.status === 'APPROVED') {
        const product = await tx.product.findFirst({ where: { id: existing.productId, deletedAt: null }, select: { id: true, currentQty: true } });
        if (!product) {
          throw new Error(`Produk tidak ditemukan: ${existing.productId}`);
        }
        await incrementProductStock(tx, product.id, existing.qty);
        const updatedProduct = await tx.product.findFirst({ where: { id: product.id }, select: { currentQty: true } });
        const nextQty = updatedProduct?.currentQty ?? product.currentQty + existing.qty;
        await tx.stockMovement.create({ data: { productId: product.id, batchId: existing.batchId ?? null, warehouseId: existing.warehouseId ?? null, type: 'IN', refType: 'RETURN', refId: updated.id, qty: existing.qty, balanceAfter: nextQty, notes: rawData.notes ?? null, createdBy: actor.id } });
      }

      await tx.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'StockReturn', entityId: updated.id, changes: { status: rawData.status, notes: rawData.notes ?? null } as Prisma.InputJsonValue } });
      return updated;
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal memperbarui return' };
  }

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/inventory');
  }
  return { success: true, data: { id: result.id } };
}

export async function createDisposal(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(approvalRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(disposalSchema, rawData);
  if (!parsed.success) return parsed;

  let result;
  try {
    result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const product = await tx.product.findFirst({ where: { id: parsed.data.productId, deletedAt: null }, select: { id: true, currentQty: true } });
      if (!product) {
        throw new Error('Produk tidak ditemukan');
      }

      const created = await tx.disposal.create({ data: { disposalNo: `DS-${Date.now()}`, productId: parsed.data.productId, warehouseId: parsed.data.warehouseId || null, batchId: parsed.data.batchId || null, type: parsed.data.type, qty: parsed.data.qty, reason: parsed.data.reason, status: 'POSTED', notes: parsed.data.notes || null } });
      await decrementProductStock(tx, product.id, parsed.data.qty);
      const updatedProduct = await tx.product.findFirst({ where: { id: product.id }, select: { currentQty: true } });
      await tx.stockMovement.create({ data: { productId: product.id, batchId: parsed.data.batchId || null, warehouseId: parsed.data.warehouseId || null, type: 'DISPOSAL', refType: 'DISPOSAL', refId: created.id, qty: -Math.abs(parsed.data.qty), balanceAfter: updatedProduct?.currentQty ?? Math.max(0, product.currentQty - parsed.data.qty), notes: parsed.data.reason, createdBy: actor.id } });
      await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Disposal', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
      return created;
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal membuat disposal' };
  }

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/inventory');
  }
  return { success: true, data: { id: result.id } };
}

export async function getInventoryAlerts() {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const products = await db.product.findMany({ where: { deletedAt: null, isActive: true }, select: { id: true, name: true, currentQty: true, minStock: true, reorderLevel: true, maxStock: true, requiresBatch: true } });
  const now = new Date();
  const nearExpired = await db.inventoryBatch.findMany({ where: { deletedAt: null, currentQty: { gt: 0 }, expiryDate: { not: null, lt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } }, select: { id: true, productId: true, batchNo: true, expiryDate: true, currentQty: true } });
  const expired = await db.inventoryBatch.findMany({ where: { deletedAt: null, currentQty: { gt: 0 }, expiryDate: { not: null, lte: now } }, select: { id: true, productId: true, batchNo: true, expiryDate: true, currentQty: true } });
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fastMoving = await db.stockMovement.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { productId: true, qty: true } });
  const fastIds = new Set(fastMoving.filter((movement) => (movement.qty ?? 0) > 0).map((movement) => movement.productId));
  const slowMoving = await db.stockMovement.findMany({ where: { createdAt: { lt: thirtyDaysAgo } }, select: { productId: true } });
  const slowIds = new Set(slowMoving.map((movement) => movement.productId));

  const alerts = [] as Array<{ type: string; productId: string; message: string }>;
  for (const product of products) {
    if (product.currentQty <= 0) alerts.push({ type: 'OUT_OF_STOCK', productId: product.id, message: `${product.name} habis stok` });
    else if (product.currentQty <= (product.minStock || 0)) alerts.push({ type: 'LOW_STOCK', productId: product.id, message: `${product.name} mendekati batas minimum` });
    else if (product.currentQty <= (product.reorderLevel || 0)) alerts.push({ type: 'CRITICAL_STOCK', productId: product.id, message: `${product.name} perlu restock` });
    if ((product.maxStock || 0) > 0 && product.currentQty > product.maxStock) alerts.push({ type: 'OVERSTOCK', productId: product.id, message: `${product.name} melewati batas maksimum` });
    if (fastIds.has(product.id)) alerts.push({ type: 'FAST_MOVING', productId: product.id, message: `${product.name} bergerak cepat` });
    if (slowIds.has(product.id) && product.currentQty > 0) alerts.push({ type: 'SLOW_MOVING', productId: product.id, message: `${product.name} bergerak lambat` });
  }
  for (const batch of nearExpired) {
    alerts.push({ type: 'NEAR_EXPIRED', productId: batch.productId, message: `Batch ${batch.batchNo} akan kedaluwarsa` });
  }
  for (const batch of expired) {
    alerts.push({ type: 'EXPIRED', productId: batch.productId, message: `Batch ${batch.batchNo} sudah kedaluwarsa` });
  }
  return { success: true, data: { alerts, total: alerts.length } };
}

export async function getInventoryReportData() {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const now = new Date();
  const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [products, suppliers, warehouses, purchaseOrders, goodsReceipts, supplierInvoices, supplierPayments, transfers, adjustments, opnames, nearExpiredBatches, expiredBatches, disposals, movements] = await Promise.all([
    db.product.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, sku: true, name: true, currentQty: true, reorderLevel: true, costPrice: true } }),
    db.supplier.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, name: true, status: true, creditLimit: true } }),
    db.warehouse.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, name: true, code: true, location: true } }),
    db.purchaseOrder.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, poNumber: true, supplierName: true, status: true, total: true } }),
    db.goodsReceipt.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, receiptNo: true, status: true, receivedAt: true } }),
    db.supplierInvoice.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, invoiceNo: true, supplierName: true, status: true, total: true, paidAmount: true } }),
    db.supplierPayment.findMany({ orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, amount: true, method: true, referenceNo: true, paidAt: true } }),
    db.warehouseTransfer.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, transferNo: true, status: true, requestedBy: true, createdAt: true } }),
    db.stockMovement.findMany({ where: { type: 'ADJUSTMENT' }, orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, refId: true, qty: true, notes: true, createdAt: true, product: { select: { id: true, name: true } } } }),
    db.stockMovement.findMany({ where: { type: 'OPNAME' }, orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, refId: true, qty: true, notes: true, createdAt: true, product: { select: { id: true, name: true } } } }),
    db.inventoryBatch.findMany({ where: { deletedAt: null, currentQty: { gt: 0 }, expiryDate: { not: null, gt: now, lte: thirtyDaysAhead } }, orderBy: { expiryDate: 'asc' }, take: 8, select: { id: true, batchNo: true, productId: true, expiryDate: true, currentQty: true } }),
    db.inventoryBatch.findMany({ where: { deletedAt: null, currentQty: { gt: 0 }, expiryDate: { not: null, lte: now } }, orderBy: { expiryDate: 'asc' }, take: 8, select: { id: true, batchNo: true, productId: true, expiryDate: true, currentQty: true } }),
    db.disposal.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, disposalNo: true, type: true, qty: true, status: true, createdAt: true } }),
    db.stockMovement.findMany({ orderBy: { createdAt: 'desc' }, take: 12, include: { product: { select: { id: true, name: true } } } }),
  ]);

  const stockValue = products.reduce((sum, product) => sum + product.currentQty * Number(product.costPrice ?? 0), 0);
  return {
    success: true,
    data: {
      products,
      suppliers,
      warehouses,
      purchaseOrders,
      goodsReceipts,
      supplierInvoices,
      supplierPayments,
      transfers,
      adjustments,
      opnames,
      nearExpiredBatches,
      expiredBatches,
      disposals,
      movements,
      stockValue,
    },
  };
}

export async function getInventoryDashboardSummary() {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const now = new Date();
  const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const [products, warehouses, purchaseOrders, suppliers, lowStock, nearExpiredBatches, expiredBatches, adjustments, disposals, transfers] = await Promise.all([
    db.product.findMany({ where: { deletedAt: null }, select: { id: true, currentQty: true, costPrice: true, basePrice: true, minStock: true, reorderLevel: true } }),
    db.warehouse.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
    db.purchaseOrder.findMany({ where: { deletedAt: null }, select: { id: true, total: true, status: true } }),
    db.supplier.findMany({ where: { deletedAt: null }, select: { id: true, status: true } }),
    db.product.count({ where: { deletedAt: null, currentQty: { lte: 0 } } }),
    db.inventoryBatch.count({ where: { deletedAt: null, currentQty: { gt: 0 }, expiryDate: { not: null, gt: now, lte: thirtyDaysAhead } } }),
    db.inventoryBatch.count({ where: { deletedAt: null, currentQty: { gt: 0 }, expiryDate: { not: null, lte: now } } }),
    db.stockMovement.count({ where: { type: 'ADJUSTMENT', createdAt: { gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000) } } }),
    db.disposal.count({ where: { deletedAt: null } }),
    db.warehouseTransfer.count({ where: { deletedAt: null, status: 'APPROVED' } }),
  ]);

  const stockValue = products.reduce((sum, product) => sum + product.currentQty * Number(product.costPrice ?? 0), 0);
  const purchaseValue = purchaseOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  const activeSupplierCount = suppliers.filter((supplier) => supplier.status === 'ACTIVE').length;
  return { success: true, data: { productCount: products.length, warehouseCount: warehouses.length, purchaseOrderCount: purchaseOrders.length, supplierCount: suppliers.length, activeSupplierCount, lowStockCount: lowStock, nearExpiredCount: nearExpiredBatches, expiredCount: expiredBatches, stockValue, purchaseValue, adjustmentCount: adjustments, disposalCount: disposals, transferCount: transfers } };
}

export async function createStockAdjustment(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(approvalRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(stockAdjustmentSchema, rawData);
  if (!parsed.success) return parsed;

  let result;
  try {
    result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const product = await tx.product.findFirst({ where: { id: parsed.data.productId, deletedAt: null }, select: { id: true, currentQty: true, requiresBatch: true } });
      if (!product) {
        throw new Error('Produk tidak ditemukan');
      }

      if (parsed.data.delta >= 0) {
        await incrementProductStock(tx, product.id, parsed.data.delta);
      } else {
        await decrementProductStock(tx, product.id, Math.abs(parsed.data.delta));
      }

      const updated = await tx.product.findFirst({ where: { id: product.id }, select: { id: true, currentQty: true } });
      await tx.stockMovement.create({ data: { productId: product.id, batchId: null, warehouseId: parsed.data.warehouseId || null, type: 'ADJUSTMENT', refType: 'ADJUSTMENT', refId: `adjust-${Date.now()}`, qty: parsed.data.delta, balanceAfter: updated?.currentQty ?? product.currentQty + parsed.data.delta, notes: parsed.data.notes, createdBy: actor.id } });
      await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'StockAdjustment', entityId: product.id, changes: { ...parsed.data, delta: parsed.data.delta } as Prisma.InputJsonValue } });
      return updated ?? product;
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal membuat penyesuaian stok' };
  }

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/inventory');
  }
  return { success: true, data: { id: result.id } };
}

export async function createStockOpname(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(approvalRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(stockOpnameSchema, rawData);
  if (!parsed.success) return parsed;

  let result;
  try {
    result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const product = await tx.product.findFirst({ where: { id: parsed.data.productId, deletedAt: null }, select: { id: true, currentQty: true } });
      if (!product) {
        throw new Error('Produk tidak ditemukan');
      }

      if (parsed.data.delta >= 0) {
        await incrementProductStock(tx, product.id, parsed.data.delta);
      } else {
        await decrementProductStock(tx, product.id, Math.abs(parsed.data.delta));
      }

      const updated = await tx.product.findFirst({ where: { id: product.id }, select: { id: true, currentQty: true } });
      await tx.stockMovement.create({ data: { productId: product.id, batchId: null, warehouseId: parsed.data.warehouseId || null, type: 'OPNAME', refType: 'OPNAME', refId: `opname-${Date.now()}`, qty: parsed.data.delta, balanceAfter: updated?.currentQty ?? product.currentQty + parsed.data.delta, notes: parsed.data.notes, createdBy: actor.id } });
      await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'StockOpname', entityId: product.id, changes: parsed.data as Prisma.InputJsonValue } });
      return updated ?? product;
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal membuat opname stok' };
  }

  revalidatePath('/inventory');
  return { success: true, data: { id: result.id } };
}

export async function createDispensing(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(stockAdjustmentSchema, rawData);
  if (!parsed.success) return parsed;

  let result;
  try {
    result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const product = await tx.product.findFirst({ where: { id: parsed.data.productId, deletedAt: null, isActive: true }, select: { id: true, name: true, requiresBatch: true, currentQty: true } });
      if (!product) {
        throw new Error('Produk tidak ditemukan');
      }

      const batches = product.requiresBatch ? (await tx.inventoryBatch.findMany({ where: { productId: product.id, deletedAt: null, currentQty: { gt: 0 } }, select: { id: true, currentQty: true, expiryDate: true } })) as Array<{ id: string; currentQty: number; expiryDate: Date | null }> : [];
      const allocations = product.requiresBatch ? allocateFefoBatches(batches, Math.abs(parsed.data.delta)) : [];
      if (product.requiresBatch && !allocations.length) {
        throw new Error('Stok obat tidak mencukupi');
      }

      if (product.requiresBatch && allocations.length) {
        await decrementProductStock(tx, product.id, Math.abs(parsed.data.delta));
        for (const allocation of allocations) {
          const batch = batches.find((candidate) => candidate.id === allocation.id);
          if (!batch) continue;
          await decrementBatchStock(tx, batch.id, allocation.qty);
          const updatedBatch = await tx.inventoryBatch.findFirst({ where: { id: batch.id }, select: { currentQty: true } });
          await tx.stockMovement.create({ data: { productId: product.id, batchId: batch.id, warehouseId: null, type: 'OUT', refType: 'MEDICAL', refId: `dispense-${Date.now()}`, qty: -allocation.qty, balanceAfter: updatedBatch?.currentQty ?? batch.currentQty - allocation.qty, notes: parsed.data.notes, createdBy: actor.id } });
        }
      } else if (!product.requiresBatch) {
        await decrementProductStock(tx, product.id, Math.abs(parsed.data.delta));
        const updatedProduct = await tx.product.findFirst({ where: { id: product.id }, select: { currentQty: true } });
        await tx.stockMovement.create({ data: { productId: product.id, batchId: null, warehouseId: null, type: 'OUT', refType: 'MEDICAL', refId: `dispense-${Date.now()}`, qty: Math.abs(parsed.data.delta), balanceAfter: updatedProduct?.currentQty ?? product.currentQty - Math.abs(parsed.data.delta), notes: parsed.data.notes, createdBy: actor.id } });
      }

      await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Dispensing', entityId: product.id, changes: parsed.data as Prisma.InputJsonValue } });
      return { id: product.id };
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal membuat dispensing' };
  }

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/inventory');
  }
  return { success: true, data: result };
}

export async function listSuppliers(params?: { page?: number; pageSize?: number; search?: string }) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const search = params?.search?.trim();

  const where = {
    deletedAt: null,
    ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
  };

  const [items, total] = await Promise.all([
    db.supplier.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, name: true, status: true } }),
    db.supplier.count({ where }),
  ]);

  return { success: true, data: { items, total, page, pageSize } };
}

export async function listWarehouses(params?: { page?: number; pageSize?: number; search?: string }) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const search = params?.search?.trim();

  const where = {
    deletedAt: null,
    ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { code: { contains: search, mode: 'insensitive' as const } }] } : {}),
  };

  const [items, total] = await Promise.all([
    db.warehouse.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, name: true, code: true, location: true, isDefault: true } }),
    db.warehouse.count({ where }),
  ]);

  return { success: true, data: { items, total, page, pageSize } };
}

export async function listPurchaseOrders(params?: { page?: number; pageSize?: number; search?: string }) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(inventoryRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const search = params?.search?.trim();

  const where = {
    deletedAt: null,
    ...(search ? { OR: [{ poNumber: { contains: search, mode: 'insensitive' as const } }, { supplierName: { contains: search, mode: 'insensitive' as const } }] } : {}),
  };

  const [items, total] = await Promise.all([
    db.purchaseOrder.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, poNumber: true, supplierName: true, status: true, total: true } }),
    db.purchaseOrder.count({ where }),
  ]);

  return { success: true, data: { items, total, page, pageSize } };
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

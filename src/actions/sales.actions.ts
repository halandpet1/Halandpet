'use server';

import { Prisma, type UserRole, type InvoiceStatus, type PaymentMethod } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { parseOrFail, type ActionResult } from '@/lib/action-utils';
import { invoiceBillingSchema, posCheckoutSchema, voidInvoiceSchema } from '@/validators/sales.schema';
import { selectFefoBatch } from '@/lib/inventory-utils';

const salesRoles: UserRole[] = ['OWNER', 'ADMIN', 'CASHIER', 'STAFF'];

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

async function createInvoiceNumber(tx: Prisma.TransactionClient) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const sequenceClient = (tx as Prisma.TransactionClient & { invoiceSequence?: { findUnique: (args: { where: { yearMonth: string } }) => Promise<{ nextNumber: number } | null>; upsert: (args: { where: { yearMonth: string }; update: { nextNumber: number }; create: { yearMonth: string; nextNumber: number } }) => Promise<unknown> } }).invoiceSequence;

  if (sequenceClient?.findUnique && sequenceClient?.upsert) {
    const sequence = await sequenceClient.findUnique({ where: { yearMonth } });
    const nextNumber = sequence ? sequence.nextNumber : 1;
    const invoiceNo = `INV-${yearMonth}-${String(nextNumber).padStart(5, '0')}`;

    await sequenceClient.upsert({
      where: { yearMonth },
      update: { nextNumber: nextNumber + 1 },
      create: { yearMonth, nextNumber: nextNumber + 1 },
    });

    return invoiceNo;
  }

  const counter = (globalThis as typeof globalThis & { __invoiceSequenceCounter?: number }).__invoiceSequenceCounter ?? 1;
  (globalThis as typeof globalThis & { __invoiceSequenceCounter?: number }).__invoiceSequenceCounter = counter + 1;
  return `INV-${yearMonth}-${String(counter).padStart(5, '0')}`;
}

export async function createPosCheckout(rawData: unknown): Promise<ActionResult<{ id: string; invoiceNo: string; receiptNo: string | null }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(salesRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(posCheckoutSchema, rawData);
  if (!parsed.success) return parsed;

  try {
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const invoiceTotal = parsed.data.items.reduce((sum: number, item) => sum + item.qty * item.unitPrice, 0) - parsed.data.discount;
    const invoice = await tx.invoice.create({
      data: {
        invoiceNo: await createInvoiceNumber(tx),
        customerId: parsed.data.customerId || 'cl-walk-in',
        status: parsed.data.amountPaid > 0 ? 'PARTIAL' : 'PENDING',
        source: 'POS',
        subtotal: parsed.data.items.reduce((sum: number, item) => sum + item.qty * item.unitPrice, 0),
        tax: 0,
        discount: parsed.data.discount,
        total: invoiceTotal,
          notes: parsed.data.notes || null,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });

      for (const item of parsed.data.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId }, select: { id: true, name: true, requiresBatch: true, currentQty: true, sellingPrice: true } });
        if (!product) {
          throw new Error(`Produk ${item.productId} tidak ditemukan`);
        }

        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            productId: product.id,
            description: product.name,
            qty: item.qty,
            unitPrice: item.unitPrice,
            total: item.qty * item.unitPrice,
          },
        });

        if (product.requiresBatch) {
          const batches = await tx.inventoryBatch.findMany({ where: { productId: product.id, deletedAt: null }, select: { id: true, currentQty: true, expiryDate: true } });
          const batch = selectFefoBatch(batches, item.qty);
          if (!batch) {
            throw new Error(`Stok batch tidak tersedia untuk ${product.name}`);
          }
          await tx.inventoryBatch.update({ where: { id: batch.id }, data: { currentQty: batch.currentQty - item.qty } });
        } else {
          await tx.product.update({ where: { id: product.id }, data: { currentQty: { decrement: item.qty } } });
        }

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            batchId: null,
            warehouseId: null,
            type: 'OUT',
            refType: 'SALES',
            refId: invoice.id,
            qty: -item.qty,
            balanceAfter: Math.max(0, product.currentQty - item.qty),
            notes: 'POS checkout',
            createdBy: actor.id,
          },
        });
      }

const paymentAmount = Math.min(parsed.data.amountPaid, Number(invoiceTotal));
    const receiptNo = paymentAmount > 0 ? `RCP-${String(Date.now()).slice(-4)}` : null;

    await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        method: parsed.data.paymentMethod as PaymentMethod,
        amount: paymentAmount,
        referenceNo: null,
        status: 'SUCCESS',
        createdBy: actor.id,
      },
    });

    const nextStatus = paymentAmount >= Number(invoiceTotal) ? 'PAID' : 'PARTIAL';
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: nextStatus,
        paidAmount: paymentAmount,
        receiptNo: receiptNo ?? undefined,
      },
    });

    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Invoice', entityId: invoice.id, changes: parsed.data as Prisma.InputJsonValue } });
    return { ...invoice, receiptNo };
    });

    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
      revalidatePath('/pos');
      revalidatePath('/dashboard');
    }

    return { success: true, data: { id: result.id, invoiceNo: result.invoiceNo, receiptNo: result.receiptNo ?? null } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal membuat checkout POS' };
  }
}

export async function updateInvoiceBilling(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(salesRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(invoiceBillingSchema, rawData);
  if (!parsed.success) return parsed;

  const invoice = await db.invoice.findUnique({ where: { id: parsed.data.id }, select: { id: true } });
  if (!invoice) return { success: false, error: 'Invoice tidak ditemukan' };

  const nextDueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  await db.invoice.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status as InvoiceStatus,
      dueDate: nextDueDate,
      paymentTerms: parsed.data.paymentTerms || null,
      notes: parsed.data.notes || null,
      updatedBy: actor.id,
      updatedAt: new Date(),
    },
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/dashboard');
  }

  return { success: true, data: { id: parsed.data.id } };
}

export async function voidInvoice(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(['OWNER', 'ADMIN']);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(voidInvoiceSchema, rawData);
  if (!parsed.success) return parsed;

  const invoice = await db.invoice.findUnique({ where: { id: parsed.data.invoiceId }, select: { id: true, status: true, paidAmount: true, total: true } });
  if (!invoice) return { success: false, error: 'Invoice tidak ditemukan' };
  if (invoice.status === 'VOID' || invoice.status === 'REFUNDED') return { success: false, error: 'Invoice sudah dibatalkan' };

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'VOID',
        paidAmount: 0,
        notes: parsed.data.reason,
        updatedBy: actor.id,
        updatedAt: new Date(),
      },
    });

    const items = await tx.invoiceItem.findMany({ where: { invoiceId: invoice.id }, select: { productId: true, qty: true } });
    for (const item of items) {
      if (!item.productId) continue;
      const product = await tx.product.findUnique({ where: { id: item.productId }, select: { id: true, name: true, requiresBatch: true, currentQty: true } });
      if (!product) continue;

      if (product.requiresBatch) {
        const batches = await tx.inventoryBatch.findMany({ where: { productId: product.id, deletedAt: null }, select: { id: true, currentQty: true } });
        const batch = batches[0];
        if (batch) {
          await tx.inventoryBatch.update({ where: { id: batch.id }, data: { currentQty: batch.currentQty + item.qty } });
        }
      } else {
        await tx.product.update({ where: { id: product.id }, data: { currentQty: { increment: item.qty } } });
      }

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          batchId: null,
          warehouseId: null,
          type: 'RETURN',
          refType: 'SALES',
          refId: updated.id,
          qty: item.qty,
          balanceAfter: product.currentQty + item.qty,
          notes: `Void invoice: ${parsed.data.reason}`,
          createdBy: actor.id,
        },
      });
    }

    await tx.auditLog.create({ data: { userId: actor.id, action: 'VOID', entity: 'Invoice', entityId: updated.id, changes: { reason: parsed.data.reason } as Prisma.InputJsonValue } });
    return updated;
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/dashboard');
    revalidatePath('/pos');
  }

  return { success: true, data: { id: result.id } };
}

export async function createInvoicePayment(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(salesRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const paymentSchema = z.object({
    invoiceId: z.string().trim().min(1),
    method: z.enum(['CASH', 'CARD', 'DEBIT', 'QRIS', 'TRANSFER']).default('CASH'),
    amount: z.coerce.number().min(1),
    referenceNo: z.string().trim().optional().or(z.literal('')),
  });
  const parsed = await parseOrFail(paymentSchema, rawData);
  if (!parsed.success) return parsed;

  const invoice = await db.invoice.findUnique({ where: { id: parsed.data.invoiceId }, select: { id: true, total: true, paidAmount: true, status: true } });
  if (!invoice) return { success: false, error: 'Invoice tidak ditemukan' };

  const payment = await db.payment.create({
    data: {
      invoiceId: parsed.data.invoiceId,
      method: parsed.data.method as PaymentMethod,
      amount: parsed.data.amount,
      referenceNo: parsed.data.referenceNo || null,
      status: 'SUCCESS',
      createdBy: actor.id,
    },
  });

  const nextPaidAmount = Number(invoice.paidAmount) + parsed.data.amount;
  const nextStatus = nextPaidAmount >= Number(invoice.total) ? 'PAID' : 'PARTIAL';
  await db.invoice.update({
    where: { id: parsed.data.invoiceId },
    data: {
      paidAmount: nextPaidAmount,
      status: nextStatus,
      updatedBy: actor.id,
      updatedAt: new Date(),
    },
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/dashboard');
  }

  return { success: true, data: { id: payment.id } };
}

export async function createInvoiceRefund(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(['OWNER', 'ADMIN']);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const refundSchema = z.object({
    invoiceId: z.string().trim().min(1),
    amount: z.coerce.number().min(1),
    reason: z.string().trim().min(1, 'Alasan refund wajib diisi'),
  });
  const parsed = await parseOrFail(refundSchema, rawData);
  if (!parsed.success) return parsed;

  const invoice = await db.invoice.findUnique({ where: { id: parsed.data.invoiceId }, select: { id: true, total: true, paidAmount: true, status: true, customerId: true } });
  if (!invoice) return { success: false, error: 'Invoice tidak ditemukan' };

  const refundAmount = Math.min(parsed.data.amount, Number(invoice.paidAmount));
  if (refundAmount <= 0) return { success: false, error: 'Jumlah refund tidak valid' };

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const refundPayment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        method: 'CASH',
        amount: refundAmount,
        referenceNo: null,
        status: 'REFUNDED',
        createdBy: actor.id,
      },
    });

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: Math.max(0, Number(invoice.paidAmount) - refundAmount),
        status: 'REFUNDED',
        updatedBy: actor.id,
        updatedAt: new Date(),
      },
    });

    const items = await tx.invoiceItem.findMany({ where: { invoiceId: invoice.id }, select: { productId: true, qty: true } });
    for (const item of items) {
      if (!item.productId) continue;
      const product = await tx.product.findUnique({ where: { id: item.productId }, select: { id: true, name: true, requiresBatch: true, currentQty: true } });
      if (!product) continue;
      if (product.requiresBatch) {
        const batches = await tx.inventoryBatch.findMany({ where: { productId: product.id, deletedAt: null }, select: { id: true, currentQty: true, expiryDate: true } });
        const batch = batches[0];
        if (batch) {
          await tx.inventoryBatch.update({ where: { id: batch.id }, data: { currentQty: batch.currentQty + item.qty } });
        }
      } else {
        await tx.product.update({ where: { id: product.id }, data: { currentQty: { increment: item.qty } } });
      }

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          batchId: null,
          warehouseId: null,
          type: 'RETURN',
          refType: 'SALES',
          refId: invoice.id,
          qty: item.qty,
          balanceAfter: product.currentQty + item.qty,
          notes: `Refund: ${parsed.data.reason}`,
          createdBy: actor.id,
        },
      });
    }

    await tx.auditLog.create({ data: { userId: actor.id, action: 'REFUND', entity: 'Invoice', entityId: invoice.id, changes: { amount: refundAmount, reason: parsed.data.reason } as Prisma.InputJsonValue } });
    return refundPayment;
  });

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    revalidatePath('/dashboard');
    revalidatePath('/pos');
  }

  return { success: true, data: { id: result.id } };
}

export async function getInvoiceDetail(invoiceId: string) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(salesRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      invoiceNo: true,
      customerId: true,
      status: true,
      subtotal: true,
      tax: true,
      discount: true,
      total: true,
      paidAmount: true,
      dueDate: true,
      paymentTerms: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      customer: { select: { id: true, name: true, phone: true } },
      items: { select: { id: true, description: true, qty: true, unitPrice: true, total: true } },
      payments: { select: { id: true, method: true, amount: true, createdAt: true } },
    },
  });

  if (!invoice) return { success: false, error: 'Invoice tidak ditemukan' };

  const outstandingBalance = Number(invoice.total) - Number(invoice.paidAmount);
  return { success: true, data: { ...invoice, outstandingBalance } };
}

export async function getBillingSummary() {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(salesRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const [invoices, pendingInvoices, overdueInvoices] = await Promise.all([
    db.invoice.findMany({ where: { deletedAt: null }, select: { total: true, paidAmount: true, dueDate: true, status: true } }),
    db.invoice.count({ where: { deletedAt: null, status: { in: ['PENDING', 'PARTIAL'] } } }),
    db.invoice.count({ where: { deletedAt: null, status: { in: ['PENDING', 'PARTIAL'] }, dueDate: { lt: new Date() } } }),
  ]);

  const totalBilled = invoices.reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const totalPaid = invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount), 0);
  const outstandingBalance = totalBilled - totalPaid;

  return { success: true, data: { totalBilled, totalPaid, outstandingBalance, pendingInvoices, overdueInvoices } };
}

export async function getReceiptData(invoiceId: string) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(salesRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      invoiceNo: true,
      receiptNo: true,
      status: true,
      subtotal: true,
      tax: true,
      discount: true,
      total: true,
      paidAmount: true,
      notes: true,
      createdAt: true,
      customer: { select: { id: true, name: true, phone: true } },
      items: { select: { description: true, qty: true, unitPrice: true, total: true } },
      payments: { select: { method: true, amount: true, createdAt: true } },
    },
  });

  if (!invoice) return { success: false, error: 'Invoice tidak ditemukan' };

  return {
    success: true,
    data: {
      invoiceNo: invoice.invoiceNo,
      receiptNo: invoice.receiptNo ?? null,
      customer: invoice.customer,
      status: invoice.status,
      createdAt: invoice.createdAt,
      subtotal: Number(invoice.subtotal),
      tax: Number(invoice.tax),
      discount: Number(invoice.discount),
      total: Number(invoice.total),
      paidAmount: Number(invoice.paidAmount),
      notes: invoice.notes,
      items: invoice.items,
      payments: invoice.payments,
    },
  };
}

export async function getCustomerMembership(customerId: string) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(salesRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const membership = await db.customerMembership.findUnique({ where: { customerId }, select: { id: true, tier: true, status: true, discountPercent: true, points: true, pointsExpiryDate: true, lastActivityAt: true } });
  return membership ? { success: true, data: membership } : { success: true, data: null };
}

export async function upsertCustomerMembership(rawData: unknown) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(['OWNER', 'ADMIN', 'CASHIER']);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const membershipSchema = z.object({ customerId: z.string().trim().min(1), tier: z.string().trim().default('STANDARD'), status: z.string().trim().default('ACTIVE'), discountPercent: z.coerce.number().int().min(0).max(100).default(0) });
  const parsed = await parseOrFail(membershipSchema, rawData);
  if (!parsed.success) return parsed;

  const membership = await db.customerMembership.upsert({
    where: { customerId: parsed.data.customerId },
    update: { tier: parsed.data.tier, status: parsed.data.status, discountPercent: parsed.data.discountPercent, updatedBy: actor.id },
    create: { customerId: parsed.data.customerId, tier: parsed.data.tier, status: parsed.data.status, discountPercent: parsed.data.discountPercent, createdBy: actor.id, updatedBy: actor.id },
  });

  await db.auditLog.create({ data: { userId: actor.id, action: 'UPSERT', entity: 'CustomerMembership', entityId: membership.id, changes: parsed.data as Prisma.InputJsonValue } });
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') revalidatePath('/pos');
  return { success: true, data: membership };
}

export async function adjustLoyaltyPoints(rawData: unknown) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(['OWNER', 'ADMIN', 'CASHIER']);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const adjustmentSchema = z.object({ customerId: z.string().trim().min(1), amount: z.coerce.number().int(), reason: z.string().trim().min(1) });
  const parsed = await parseOrFail(adjustmentSchema, rawData);
  if (!parsed.success) return parsed;

  const membership = await db.customerMembership.findUnique({ where: { customerId: parsed.data.customerId }, select: { id: true, points: true } });
  if (!membership) return { success: false, error: 'Membership pelanggan tidak ditemukan' };

  const nextPoints = membership.points + parsed.data.amount;
  await db.customerMembership.update({ where: { customerId: parsed.data.customerId }, data: { points: nextPoints, lastActivityAt: new Date(), updatedBy: actor.id } });
  await db.loyaltyPointLedger.create({ data: { customerId: parsed.data.customerId, entryType: 'ADJUSTMENT', amount: parsed.data.amount, balanceAfter: nextPoints, reason: parsed.data.reason, createdBy: actor.id } });
  await db.auditLog.create({ data: { userId: actor.id, action: 'ADJUST', entity: 'LoyaltyPoint', entityId: parsed.data.customerId, changes: parsed.data as Prisma.InputJsonValue } });
  return { success: true, data: { points: nextPoints } };
}

export async function redeemLoyaltyPoints(rawData: unknown) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(['OWNER', 'ADMIN', 'CASHIER']);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const redemptionSchema = z.object({ customerId: z.string().trim().min(1), amount: z.coerce.number().int().min(1), reason: z.string().trim().min(1) });
  const parsed = await parseOrFail(redemptionSchema, rawData);
  if (!parsed.success) return parsed;

  const membership = await db.customerMembership.findUnique({ where: { customerId: parsed.data.customerId }, select: { id: true, points: true } });
  if (!membership || membership.points < parsed.data.amount) return { success: false, error: 'Poin tidak mencukupi' };

  const nextPoints = membership.points - parsed.data.amount;
  await db.customerMembership.update({ where: { customerId: parsed.data.customerId }, data: { points: nextPoints, lastActivityAt: new Date(), updatedBy: actor.id } });
  await db.loyaltyPointLedger.create({ data: { customerId: parsed.data.customerId, entryType: 'REDEEM', amount: -parsed.data.amount, balanceAfter: nextPoints, reason: parsed.data.reason, createdBy: actor.id } });
  await db.auditLog.create({ data: { userId: actor.id, action: 'REDEEM', entity: 'LoyaltyPoint', entityId: parsed.data.customerId, changes: parsed.data as Prisma.InputJsonValue } });
  return { success: true, data: { points: nextPoints } };
}

export async function getLoyaltyHistory(customerId: string) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(salesRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const items = await db.loyaltyPointLedger.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' }, take: 20 });
  return { success: true, data: { items } };
}

export async function createVoucher(rawData: unknown) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(['OWNER', 'ADMIN']);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const voucherSchema = z.object({ code: z.string().trim().min(1), description: z.string().trim().optional().or(z.literal('')), type: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'), value: z.coerce.number().int().min(0).default(0), minPurchase: z.coerce.number().min(0).default(0), maxDiscount: z.coerce.number().min(0).optional(), usageLimit: z.coerce.number().int().min(1).optional(), expiresAt: z.string().trim().optional().or(z.literal('')), applicableCustomerId: z.string().trim().optional().or(z.literal('')), applicableProductId: z.string().trim().optional().or(z.literal('')), applicableCategory: z.string().trim().optional().or(z.literal('')), isActive: z.boolean().default(true) });
  const parsed = await parseOrFail(voucherSchema, rawData);
  if (!parsed.success) return parsed;

  const voucher = await db.voucher.create({ data: { code: parsed.data.code.toUpperCase(), description: parsed.data.description || null, type: parsed.data.type, value: parsed.data.value, minPurchase: parsed.data.minPurchase, maxDiscount: parsed.data.maxDiscount ?? null, usageLimit: parsed.data.usageLimit ?? null, expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null, applicableCustomerId: parsed.data.applicableCustomerId || null, applicableProductId: parsed.data.applicableProductId || null, applicableCategory: parsed.data.applicableCategory || null, isActive: parsed.data.isActive } });
  await db.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Voucher', entityId: voucher.id, changes: parsed.data as Prisma.InputJsonValue } });
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') revalidatePath('/pos');
  return { success: true, data: voucher };
}

export async function validateVoucher(code: string, purchaseAmount: number, customerId?: string) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(salesRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const voucher = await db.voucher.findFirst({ where: { code: code.toUpperCase(), isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, select: { id: true, code: true, type: true, value: true, minPurchase: true, maxDiscount: true, usageLimit: true, usageCount: true, applicableCustomerId: true, applicableProductId: true, applicableCategory: true } });
  if (!voucher) return { success: false, error: 'Voucher tidak valid' };
  if (voucher.usageLimit && voucher.usageCount >= voucher.usageLimit) return { success: false, error: 'Voucher sudah habis' };
  if (Number(voucher.minPurchase) > purchaseAmount) return { success: false, error: 'Minimal pembelian belum tercapai' };
  if (voucher.applicableCustomerId && customerId && voucher.applicableCustomerId !== customerId) return { success: false, error: 'Voucher tidak berlaku untuk pelanggan ini' };

  const discount = voucher.type === 'PERCENTAGE' ? Math.min(Math.round(purchaseAmount * (voucher.value / 100)), voucher.maxDiscount ? Number(voucher.maxDiscount) : Number.POSITIVE_INFINITY) : Math.min(voucher.value, voucher.maxDiscount ? Number(voucher.maxDiscount) : voucher.value);
  return { success: true, data: { id: voucher.id, code: voucher.code, discount } };
}

export async function createPromotion(rawData: unknown) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(['OWNER', 'ADMIN']);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const promotionSchema = z.object({ name: z.string().trim().min(1), code: z.string().trim().optional().or(z.literal('')), type: z.enum(['PERCENTAGE', 'FIXED', 'BUNDLE']).default('PERCENTAGE'), value: z.coerce.number().int().min(0).default(0), minPurchase: z.coerce.number().min(0).default(0), maxDiscount: z.coerce.number().min(0).optional(), startsAt: z.string().trim().optional().or(z.literal('')), endsAt: z.string().trim().optional().or(z.literal('')), usageLimit: z.coerce.number().int().min(1).optional(), isAuto: z.boolean().default(false), isActive: z.boolean().default(true) });
  const parsed = await parseOrFail(promotionSchema, rawData);
  if (!parsed.success) return parsed;

  const promotion = await db.promotion.create({ data: { name: parsed.data.name, code: parsed.data.code || null, type: parsed.data.type, value: parsed.data.value, minPurchase: parsed.data.minPurchase, maxDiscount: parsed.data.maxDiscount ?? null, startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null, endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null, usageLimit: parsed.data.usageLimit ?? null, isAuto: parsed.data.isAuto, isActive: parsed.data.isActive } });
  await db.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Promotion', entityId: promotion.id, changes: parsed.data as Prisma.InputJsonValue } });
  return { success: true, data: promotion };
}

export async function openCashRegister(rawData: unknown) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(['OWNER', 'ADMIN', 'CASHIER']);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const shiftSchema = z.object({ openingBalance: z.coerce.number().min(0).default(0), notes: z.string().trim().optional().or(z.literal('')) });
  const parsed = await parseOrFail(shiftSchema, rawData);
  if (!parsed.success) return parsed;

  const shift = await db.cashRegisterShift.create({ data: { cashierId: actor.id, status: 'OPEN', openingBalance: parsed.data.openingBalance, notes: parsed.data.notes || null } });
  await db.auditLog.create({ data: { userId: actor.id, action: 'OPEN', entity: 'CashRegisterShift', entityId: shift.id, changes: parsed.data as Prisma.InputJsonValue } });
  return { success: true, data: shift };
}

export async function closeCashRegister(rawData: unknown) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(['OWNER', 'ADMIN', 'CASHIER']);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const closeSchema = z.object({ shiftId: z.string().trim().min(1), closingBalance: z.coerce.number().min(0), notes: z.string().trim().optional().or(z.literal('')) });
  const parsed = await parseOrFail(closeSchema, rawData);
  if (!parsed.success) return parsed;

  const shift = await db.cashRegisterShift.findUnique({ where: { id: parsed.data.shiftId }, select: { id: true, cashierId: true, openingBalance: true, cashIn: true, cashOut: true, expectedBalance: true } });
  if (!shift) return { success: false, error: 'Shift kas tidak ditemukan' };
  const expectedBalance = Number(shift.openingBalance) + Number(shift.cashIn) - Number(shift.cashOut);
  const difference = Number(parsed.data.closingBalance) - expectedBalance;
  await db.cashRegisterShift.update({ where: { id: parsed.data.shiftId }, data: { status: 'CLOSED', closingBalance: parsed.data.closingBalance, expectedBalance, difference, closedAt: new Date(), notes: parsed.data.notes || null } });
  await db.auditLog.create({ data: { userId: actor.id, action: 'CLOSE', entity: 'CashRegisterShift', entityId: shift.id, changes: parsed.data as Prisma.InputJsonValue } });
  return { success: true, data: { id: shift.id, expectedBalance, difference } };
}

export async function getSalesReportSummary() {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(salesRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now); const day = startOfWeek.getDay(); const diff = day === 0 ? -6 : 1 - day; startOfWeek.setDate(startOfWeek.getDate() + diff); startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [todayInvoices, weekInvoices, monthInvoices, yearInvoices] = await Promise.all([
    db.invoice.findMany({ where: { deletedAt: null, createdAt: { gte: startOfDay } }, select: { total: true, paidAmount: true, status: true } }),
    db.invoice.findMany({ where: { deletedAt: null, createdAt: { gte: startOfWeek } }, select: { total: true, paidAmount: true, status: true } }),
    db.invoice.findMany({ where: { deletedAt: null, createdAt: { gte: startOfMonth } }, select: { total: true, paidAmount: true, status: true } }),
    db.invoice.findMany({ where: { deletedAt: null, createdAt: { gte: startOfYear } }, select: { total: true, paidAmount: true, status: true } }),
  ]);

  const summarize = (items: Array<{ total: unknown; paidAmount: unknown; status: string }>) => {
    const revenue = items.reduce((sum, invoice) => sum + Number(invoice.total), 0);
    const paid = items.reduce((sum, invoice) => sum + Number(invoice.paidAmount), 0);
    const transactions = items.length;
    const outstanding = revenue - paid;
    return { revenue, paid, transactions, outstanding };
  };

  return {
    success: true,
    data: {
      today: summarize(todayInvoices),
      week: summarize(weekInvoices),
      month: summarize(monthInvoices),
      year: summarize(yearInvoices),
    },
  };
}

export async function listInvoicePayments(invoiceId: string) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(salesRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const items = await db.payment.findMany({
    where: { invoiceId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, method: true, amount: true, referenceNo: true, createdAt: true },
  });

  return { success: true, data: { items } };
}

export async function listSalesTransactions() {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(salesRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const items = await db.invoice.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      invoiceNo: true,
      status: true,
      total: true,
      createdAt: true,
      customer: { select: { id: true, name: true } },
      payments: { select: { id: true, method: true, amount: true } },
    },
  });

  return { success: true, data: { items } };
}

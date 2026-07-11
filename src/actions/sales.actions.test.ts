import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  product: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  inventoryBatch: { findMany: vi.fn(), update: vi.fn() },
  invoice: { create: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  invoiceItem: { create: vi.fn(), findMany: vi.fn() },
  payment: { create: vi.fn(), findMany: vi.fn() },
  stockMovement: { create: vi.fn() },
  auditLog: { create: vi.fn() },
  customer: { findMany: vi.fn() },
  customerMembership: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  loyaltyPointLedger: { create: vi.fn(), findMany: vi.fn() },
  voucher: { create: vi.fn(), findFirst: vi.fn() },
  promotion: { create: vi.fn() },
  cashRegisterShift: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
}));

const getSessionUserMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/session', () => ({ getSessionUser: getSessionUserMock }));

import { adjustLoyaltyPoints, closeCashRegister, createInvoicePayment, createInvoiceRefund, createPosCheckout, createPromotion, createVoucher, getBillingSummary, getCustomerMembership, getInvoiceDetail, listInvoicePayments, listSalesTransactions, openCashRegister, redeemLoyaltyPoints, updateInvoiceBilling, upsertCustomerMembership, voidInvoice } from './sales.actions';

describe('sales actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.$transaction.mockImplementation(async (callback: (tx: typeof dbMock) => Promise<unknown>) => callback(dbMock));
  });

  it('creates a POS checkout and reduces stock', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-1', role: 'CASHIER', fullName: 'Kasir' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'CASHIER', isActive: true, deletedAt: null });
    dbMock.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Paracetamol', currentQty: 10, requiresBatch: false, basePrice: 1200, sellingPrice: 1500 });
    dbMock.invoice.create.mockResolvedValue({ id: 'invoice-1', invoiceNo: 'INV-202607-00001' });
    dbMock.payment.create.mockResolvedValue({ id: 'payment-1' });

    const result = await createPosCheckout({
      customerId: 'cust-1',
      items: [{ productId: 'prod-1', qty: 2, unitPrice: 1500 }],
      discount: 0,
      paymentMethod: 'CASH',
      amountPaid: 3000,
      notes: 'Checkout',
    });

    expect(result.success).toBe(true);
    expect(dbMock.invoice.create).toHaveBeenCalled();
    expect(dbMock.invoiceItem.create).toHaveBeenCalled();
    expect(dbMock.payment.create).toHaveBeenCalled();
  });

  it('updates invoice billing details and due date', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-2', role: 'OWNER', fullName: 'Owner' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-2', role: 'OWNER', isActive: true, deletedAt: null });
    dbMock.invoice.findUnique.mockResolvedValue({ id: 'invoice-1', total: 3000, paidAmount: 0, status: 'PENDING' });
    dbMock.invoice.update.mockResolvedValue({ id: 'invoice-1', status: 'PENDING' });

    const result = await updateInvoiceBilling({ id: 'invoice-1', status: 'PENDING', dueDate: '2026-07-20', paymentTerms: 'Net 7', notes: 'Due soon' });

    expect(result.success).toBe(true);
    expect(dbMock.invoice.update).toHaveBeenCalled();
  });

  it('creates a invoice payment and records history', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-3', role: 'CASHIER', fullName: 'Kasir' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-3', role: 'CASHIER', isActive: true, deletedAt: null });
    dbMock.invoice.findUnique.mockResolvedValue({ id: 'invoice-1', total: 3000, paidAmount: 1000, status: 'PARTIAL' });
    dbMock.payment.create.mockResolvedValue({ id: 'payment-1' });
    dbMock.payment.findMany.mockResolvedValue([{ id: 'payment-1', method: 'CASH', amount: 2000, referenceNo: null, createdAt: new Date() }]);

    const result = await createInvoicePayment({ invoiceId: 'invoice-1', method: 'CASH', amount: 2000, referenceNo: 'TX-1' });
    const historyResult = await listInvoicePayments('invoice-1');

    expect(result.success).toBe(true);
    expect(historyResult.success).toBe(true);
    expect(dbMock.payment.create).toHaveBeenCalled();
  });

  it('creates a refund and rolls stock back', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-4', role: 'OWNER', fullName: 'Owner' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-4', role: 'OWNER', isActive: true, deletedAt: null });
    dbMock.invoice.findUnique.mockResolvedValue({ id: 'invoice-1', total: 3000, paidAmount: 3000, status: 'PAID', customerId: 'cust-1' });
    dbMock.invoice.update.mockResolvedValue({ id: 'invoice-1', status: 'REFUNDED' });
    dbMock.payment.create.mockResolvedValue({ id: 'payment-2' });
    dbMock.invoiceItem.findMany.mockResolvedValue([{ productId: 'prod-1', qty: 2 }]);
    dbMock.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Paracetamol', currentQty: 8, requiresBatch: false, sellingPrice: 1500 });

    const result = await createInvoiceRefund({ invoiceId: 'invoice-1', amount: 3000, reason: 'Customer cancel' });

    expect(result.success).toBe(true);
    expect(dbMock.payment.create).toHaveBeenCalled();
    expect(dbMock.stockMovement.create).toHaveBeenCalled();
  });

  it('voids an invoice and reverts stock movement', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-5', role: 'OWNER', fullName: 'Owner' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-5', role: 'OWNER', isActive: true, deletedAt: null });
    dbMock.invoice.findUnique.mockResolvedValue({ id: 'invoice-1', status: 'PENDING', total: 3000, paidAmount: 0, customerId: 'cust-1' });
    dbMock.invoiceItem.findMany.mockResolvedValue([{ productId: 'prod-1', qty: 2 }]);
    dbMock.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Paracetamol', currentQty: 8, requiresBatch: false });
    dbMock.invoice.update.mockResolvedValue({ id: 'invoice-1', status: 'VOID' });

    const result = await voidInvoice({ invoiceId: 'invoice-1', reason: 'Customer canceled' });

    expect(result.success).toBe(true);
    expect(dbMock.invoice.update).toHaveBeenCalled();
    expect(dbMock.stockMovement.create).toHaveBeenCalled();
  });

  it('returns invoice detail and billing summary data', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-6', role: 'CASHIER', fullName: 'Kasir' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-6', role: 'CASHIER', isActive: true, deletedAt: null });
    dbMock.invoice.findUnique.mockResolvedValue({
      id: 'invoice-1',
      invoiceNo: 'INV-202607-00001',
      customerId: 'cust-1',
      status: 'PARTIAL',
      total: 3000,
      paidAmount: 1500,
      dueDate: new Date('2026-07-20'),
      paymentTerms: 'Net 7',
      notes: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      customer: { id: 'cust-1', name: 'Walk-In' },
      items: [{ id: 'item-1', description: 'Paracetamol', qty: 2, unitPrice: 1500, total: 3000 }],
      payments: [{ id: 'payment-1', method: 'CASH', amount: 1500, createdAt: new Date() }],
    });
    dbMock.invoice.findMany.mockResolvedValue([{ id: 'invoice-1', status: 'PARTIAL', total: 3000, paidAmount: 1500 }]);

    const detailResult = await getInvoiceDetail('invoice-1');
    const summaryResult = await getBillingSummary();

    expect(detailResult.success).toBe(true);
    expect(summaryResult.success).toBe(true);
    expect(detailResult.data?.outstandingBalance).toBe(1500);
  });

  it('manages loyalty and membership flows', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-6', role: 'CASHIER', fullName: 'Kasir' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-6', role: 'CASHIER', isActive: true, deletedAt: null });
    dbMock.customerMembership.upsert.mockResolvedValue({ id: 'membership-1', customerId: 'cust-1', tier: 'STANDARD', status: 'ACTIVE', discountPercent: 5, points: 10 });
    dbMock.customerMembership.findUnique.mockResolvedValue({ id: 'membership-1', customerId: 'cust-1', points: 10 });
    dbMock.loyaltyPointLedger.create.mockResolvedValue({ id: 'ledger-1' });

    const membershipResult = await upsertCustomerMembership({ customerId: 'cust-1', tier: 'STANDARD', status: 'ACTIVE', discountPercent: 5 });
    const pointsResult = await adjustLoyaltyPoints({ customerId: 'cust-1', amount: 10, reason: 'Purchase' });
    const redeemResult = await redeemLoyaltyPoints({ customerId: 'cust-1', amount: 5, reason: 'Redeem' });
    const historyResult = await getCustomerMembership('cust-1');

    expect(membershipResult.success).toBe(true);
    expect(pointsResult.success).toBe(true);
    expect(redeemResult.success).toBe(true);
    expect(historyResult.success).toBe(true);
  });

  it('creates vouchers and promotions and manages cash register shifts', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-7', role: 'OWNER', fullName: 'Owner' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-7', role: 'OWNER', isActive: true, deletedAt: null });
    dbMock.voucher.create.mockResolvedValue({ id: 'voucher-1', code: 'SAVE10' });
    dbMock.promotion.create.mockResolvedValue({ id: 'promo-1', name: 'Flash' });
    dbMock.cashRegisterShift.create.mockResolvedValue({ id: 'shift-1', status: 'OPEN' });
    dbMock.cashRegisterShift.findUnique.mockResolvedValue({ id: 'shift-1', cashierId: 'user-7', openingBalance: 100, cashIn: 0, cashOut: 0, expectedBalance: 100 });
    dbMock.cashRegisterShift.update.mockResolvedValue({ id: 'shift-1', status: 'CLOSED' });

    const voucherResult = await createVoucher({ code: 'SAVE10', type: 'PERCENTAGE', value: 10, minPurchase: 100 });
    const promotionResult = await createPromotion({ name: 'Flash', type: 'PERCENTAGE', value: 5 });
    const openResult = await openCashRegister({ openingBalance: 100, notes: 'Start' });
    const closeResult = await closeCashRegister({ shiftId: 'shift-1', closingBalance: 100, notes: 'End' });

    expect(voucherResult.success).toBe(true);
    expect(promotionResult.success).toBe(true);
    expect(openResult.success).toBe(true);
    expect(closeResult.success).toBe(true);
  });

  it('lists recent sales transactions for the POS view', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-8', role: 'OWNER', fullName: 'Owner' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-8', role: 'OWNER', isActive: true, deletedAt: null });
    dbMock.invoice.findMany.mockResolvedValue([
      { id: 'invoice-1', invoiceNo: 'INV-202607-00001', status: 'PAID', total: 3000, createdAt: new Date(), customer: { id: 'cust-1', name: 'Walk-In' }, payments: [{ id: 'payment-1', method: 'CASH', amount: 3000 }] },
    ]);

    const result = await listSalesTransactions();

    expect(result.success).toBe(true);
    expect(result.data?.items).toHaveLength(1);
  });
});

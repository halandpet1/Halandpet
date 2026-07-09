import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  product: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  inventoryBatch: { findMany: vi.fn(), update: vi.fn(), create: vi.fn(), count: vi.fn() },
  purchaseRequest: { create: vi.fn() },
  purchaseOrder: { findUnique: vi.fn(), findMany: vi.fn() },
  goodsReceipt: { create: vi.fn(), findMany: vi.fn() },
  goodsReceiptItem: { create: vi.fn() },
  supplierInvoice: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  supplierPayment: { create: vi.fn(), findMany: vi.fn() },
  warehouseTransfer: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn(), findMany: vi.fn() },
  warehouseTransferItem: { create: vi.fn() },
  stockReturn: { findUnique: vi.fn(), update: vi.fn() },
  warehouse: { findMany: vi.fn() },
  supplier: { findMany: vi.fn(), count: vi.fn() },
  disposal: { count: vi.fn(), findMany: vi.fn() },
  stockMovement: { create: vi.fn(), count: vi.fn(), findMany: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

const getSessionUserMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/session', () => ({ getSessionUser: getSessionUserMock }));

import { createDispensing, createGoodsReceipt, createPurchaseRequest, createSupplierInvoice, createSupplierPayment, getInventoryDashboardSummary, getInventoryReportData, updateStockReturnStatus, updateWarehouseTransferStatus } from './inventory.actions';

describe('inventory actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.$transaction.mockImplementation(async (callback: (tx: typeof dbMock) => Promise<unknown>) => callback(dbMock));
  });

  it('creates a dispensing transaction for a batch-based medicine', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-1', role: 'STAFF', fullName: 'Staff' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'STAFF', isActive: true, deletedAt: null });
    dbMock.product.findFirst.mockResolvedValue({ id: 'product-1', name: 'Paracetamol', requiresBatch: true, currentQty: 10 });
    dbMock.inventoryBatch.findMany.mockResolvedValue([{ id: 'batch-1', currentQty: 10, expiryDate: new Date('2030-01-01') }]);
    dbMock.inventoryBatch.update.mockResolvedValue({ id: 'batch-1', currentQty: 8 });

    const result = await createDispensing({ productId: 'product-1', delta: 2, notes: 'Dispensed' });

    expect(result.success).toBe(true);
    expect(dbMock.stockMovement.create).toHaveBeenCalled();
  });

  it('creates a purchase request for procurement approval', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-2', role: 'STAFF', fullName: 'Staff' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-2', role: 'STAFF', isActive: true, deletedAt: null });
    dbMock.purchaseRequest.create.mockResolvedValue({ id: 'pr-1' });

    const result = await createPurchaseRequest({ productId: 'product-1', qty: 5, requestedBy: 'Staff', notes: 'Restock' });

    expect(result.success).toBe(true);
    expect(dbMock.purchaseRequest.create).toHaveBeenCalled();
  });

  it('creates a goods receipt for a purchased order', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-3', role: 'STAFF', fullName: 'Staff' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-3', role: 'STAFF', isActive: true, deletedAt: null });
    dbMock.purchaseOrder.findUnique.mockResolvedValue({ id: 'po-1', warehouseId: 'wh-1', supplierName: 'Supplier' });
    dbMock.product.findFirst.mockResolvedValue({ id: 'product-1', currentQty: 0, requiresBatch: false, costPrice: 100 });
    dbMock.product.update.mockResolvedValue({ id: 'product-1', currentQty: 5 });
    dbMock.goodsReceipt.create.mockResolvedValue({ id: 'gr-1' });

    const result = await createGoodsReceipt({ purchaseOrderId: 'po-1', warehouseId: 'wh-1', receivedBy: 'Staff', items: [{ productId: 'product-1', qty: 5, unitPrice: 100 }] });

    expect(result.success).toBe(true);
    expect(dbMock.goodsReceipt.create).toHaveBeenCalled();
  });

  it('creates a supplier invoice for a receipt', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-4', role: 'STAFF', fullName: 'Staff' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-4', role: 'STAFF', isActive: true, deletedAt: null });
    dbMock.supplierInvoice.create.mockResolvedValue({ id: 'si-1' });
    dbMock.supplierInvoice.findUnique.mockResolvedValue({ id: 'si-1', total: 550, paidAmount: 0, status: 'OPEN' });
    dbMock.supplierInvoice.update.mockResolvedValue({ id: 'si-1', total: 550, paidAmount: 275, status: 'PARTIAL' });

    const result = await createSupplierInvoice({ supplierName: 'Supplier', subtotal: 500, tax: 50, discount: 0, total: 550, purchaseOrderId: 'po-1' });

    expect(result.success).toBe(true);
    expect(dbMock.supplierInvoice.create).toHaveBeenCalled();
  });

  it('creates a supplier payment for an invoice', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-5', role: 'STAFF', fullName: 'Staff' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-5', role: 'STAFF', isActive: true, deletedAt: null });
    dbMock.supplierPayment.create.mockResolvedValue({ id: 'sp-1' });
    dbMock.supplierInvoice.findUnique.mockResolvedValue({ id: 'si-1', total: 550, paidAmount: 0, status: 'OPEN' });
    dbMock.supplierInvoice.update.mockResolvedValue({ id: 'si-1', total: 550, paidAmount: 275, status: 'PARTIAL' });

    const result = await createSupplierPayment({ supplierInvoiceId: 'si-1', amount: 275, method: 'TRANSFER', referenceNo: 'TX-001' });

    expect(result.success).toBe(true);
    expect(dbMock.supplierPayment.create).toHaveBeenCalled();
  });

  it('builds inventory dashboard summary data for reports', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-6', role: 'OWNER', fullName: 'Owner' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-6', role: 'OWNER', isActive: true, deletedAt: null });
    dbMock.product.findMany.mockResolvedValue([{ id: 'product-1', currentQty: 10, costPrice: 100, basePrice: 90, minStock: 5, reorderLevel: 3 }]);
    dbMock.warehouse.findMany.mockResolvedValue([{ id: 'wh-1', name: 'Main' }]);
    dbMock.purchaseOrder.findMany.mockResolvedValue([{ id: 'po-1', total: 500, status: 'DRAFT' }]);
    dbMock.supplier.findMany.mockResolvedValue([{ id: 'supplier-1', status: 'ACTIVE' }]);
    dbMock.inventoryBatch.count.mockResolvedValue(1);
    dbMock.stockMovement.count.mockResolvedValue(1);
    dbMock.disposal.count.mockResolvedValue(0);
    dbMock.warehouseTransfer.count.mockResolvedValue(1);

    const result = await getInventoryDashboardSummary();

    expect(result.success).toBe(true);
    expect(result.data?.stockValue).toBe(1000);
    expect(result.data?.nearExpiredCount).toBe(1);
    expect(result.data?.expiredCount).toBe(1);
  });

  it('builds inventory report data for the reporting page', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-7', role: 'OWNER', fullName: 'Owner' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-7', role: 'OWNER', isActive: true, deletedAt: null });
    dbMock.product.findMany.mockResolvedValue([{ id: 'product-1', sku: 'SKU-1', name: 'Paracetamol', currentQty: 10, reorderLevel: 3, costPrice: 100 }]);
    dbMock.supplier.findMany.mockResolvedValue([{ id: 'supplier-1', name: 'Supplier', status: 'ACTIVE', creditLimit: 1000 }]);
    dbMock.warehouse.findMany.mockResolvedValue([{ id: 'wh-1', name: 'Main', code: 'MAIN', location: 'Jakarta' }]);
    dbMock.purchaseOrder.findMany.mockResolvedValue([{ id: 'po-1', poNumber: 'PO-1', supplierName: 'Supplier', status: 'DRAFT', total: 500 }]);
    dbMock.goodsReceipt.findMany.mockResolvedValue([{ id: 'gr-1', receiptNo: 'GR-1', status: 'RECEIVED', receivedAt: new Date() }]);
    dbMock.supplierInvoice.findMany.mockResolvedValue([{ id: 'si-1', invoiceNo: 'SI-1', supplierName: 'Supplier', status: 'OPEN', total: 500, paidAmount: 0 }]);
    dbMock.supplierPayment.findMany.mockResolvedValue([{ id: 'sp-1', amount: 100, method: 'TRANSFER', referenceNo: 'TX-1', paidAt: new Date() }]);
    dbMock.warehouseTransfer.findMany.mockResolvedValue([{ id: 'tr-1', transferNo: 'TR-1', status: 'APPROVED', requestedBy: 'Owner', createdAt: new Date() }]);
    dbMock.stockMovement.findMany.mockResolvedValue([{ id: 'sm-1', refId: 'adj-1', qty: 5, notes: 'Adjust', createdAt: new Date(), product: { id: 'product-1', name: 'Paracetamol' } }]);
    dbMock.inventoryBatch.findMany.mockResolvedValue([{ id: 'batch-1', batchNo: 'B1', productId: 'product-1', expiryDate: new Date(), currentQty: 2 }]);
    dbMock.disposal.findMany.mockResolvedValue([{ id: 'ds-1', disposalNo: 'DS-1', type: 'EXPIRED', qty: 1, status: 'POSTED', createdAt: new Date() }]);

    const result = await getInventoryReportData();

    expect(result.success).toBe(true);
    expect(result.data?.products).toHaveLength(1);
    expect(result.data?.stockValue).toBe(1000);
  });

  it('approves a warehouse transfer and records stock movement', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-6', role: 'OWNER', fullName: 'Owner' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-6', role: 'OWNER', isActive: true, deletedAt: null });
    dbMock.warehouseTransfer.findUnique.mockResolvedValue({ id: 'tr-1', status: 'REQUESTED', fromWarehouseId: 'wh-1', toWarehouseId: 'wh-2', items: [{ productId: 'product-1', qty: 4, batchNo: null, notes: null }] });
    dbMock.product.findFirst.mockResolvedValue({ id: 'product-1', currentQty: 10, requiresBatch: false, costPrice: 100 });
    dbMock.warehouseTransfer.update.mockResolvedValue({ id: 'tr-1', status: 'APPROVED' });

    const result = await updateWarehouseTransferStatus({ id: 'tr-1', status: 'APPROVED', notes: 'Approved' });

    expect(result.success).toBe(true);
    expect(dbMock.stockMovement.create).toHaveBeenCalled();
  });

  it('approves a stock return and updates inventory', async () => {
    getSessionUserMock.mockResolvedValue({ id: 'user-7', role: 'OWNER', fullName: 'Owner' });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-7', role: 'OWNER', isActive: true, deletedAt: null });
    dbMock.stockReturn.findUnique.mockResolvedValue({ id: 'rt-1', type: 'SUPPLIER', productId: 'product-1', warehouseId: 'wh-1', batchId: null, qty: 3, reason: 'Damaged', status: 'REQUESTED' });
    dbMock.product.findFirst.mockResolvedValue({ id: 'product-1', currentQty: 6, requiresBatch: false, costPrice: 100 });
    dbMock.stockReturn.update.mockResolvedValue({ id: 'rt-1', status: 'APPROVED' });

    const result = await updateStockReturnStatus({ id: 'rt-1', status: 'APPROVED', notes: 'Accepted' });

    expect(result.success).toBe(true);
    expect(dbMock.stockMovement.create).toHaveBeenCalled();
  });
});

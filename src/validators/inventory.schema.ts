import { z } from 'zod';

export const productSchema = z.object({
  sku: z.string().trim().min(1, 'SKU wajib diisi'),
  name: z.string().trim().min(1, 'Nama produk wajib diisi'),
  type: z.enum(['MEDICINE', 'SUPPLEMENT', 'FOOD', 'ACCESSORY', 'SERVICE', 'OTHER']).optional().default('OTHER'),
  unit: z.string().trim().min(1, 'Satuan wajib diisi').default('pcs'),
  barcode: z.string().trim().optional().or(z.literal('')),
  category: z.string().trim().optional().or(z.literal('')),
  brand: z.string().trim().optional().or(z.literal('')),
  initialQty: z.coerce.number().int().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(0),
  maxStock: z.coerce.number().int().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).default(0),
  basePrice: z.coerce.number().min(0).default(0),
  costPrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).optional().default(0),
  taxRate: z.coerce.number().min(0).optional().default(0),
  requiresBatch: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export const supplierSchema = z.object({
  name: z.string().trim().min(1, 'Nama supplier wajib diisi'),
  contactPerson: z.string().trim().optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  email: z.string().trim().email('Email tidak valid').optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  paymentTerm: z.string().trim().optional().or(z.literal('')),
  creditLimit: z.coerce.number().min(0).default(0),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
});

export const warehouseSchema = z.object({
  name: z.string().trim().min(1, 'Nama warehouse wajib diisi'),
  code: z.string().trim().min(1, 'Kode warehouse wajib diisi'),
  location: z.string().trim().optional().or(z.literal('')),
  isDefault: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export const purchaseRequestSchema = z.object({
  productId: z.string().trim().min(1, 'Produk wajib dipilih'),
  warehouseId: z.string().trim().optional().or(z.literal('')),
  qty: z.coerce.number().int().min(1, 'Kuantitas wajib lebih dari 0'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL'),
  requestedBy: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().trim().optional().or(z.literal('')),
  warehouseId: z.string().trim().optional().or(z.literal('')),
  supplierName: z.string().trim().optional().or(z.literal('')),
  productId: z.string().trim().min(1, 'Produk wajib dipilih'),
  qty: z.coerce.number().int().min(1, 'Kuantitas wajib lebih dari 0'),
  unitPrice: z.coerce.number().min(0).default(0),
  expectedDate: z.string().trim().optional().or(z.literal('')),
  requestedBy: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
});

const goodsReceiptItemSchema = z.object({
  productId: z.string().trim().min(1, 'Produk wajib dipilih'),
  qty: z.coerce.number().int().min(1, 'Kuantitas wajib lebih dari 0'),
  unitPrice: z.coerce.number().min(0).default(0),
  batchNo: z.string().trim().optional().or(z.literal('')),
  expiryDate: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const goodsReceiptSchema = z.object({
  purchaseOrderId: z.string().trim().min(1, 'PO wajib dipilih'),
  warehouseId: z.string().trim().optional().or(z.literal('')),
  receivedBy: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
  items: z.array(goodsReceiptItemSchema).min(1, 'Minimal satu item yang diterima'),
});

export const supplierInvoiceSchema = z.object({
  supplierId: z.string().trim().optional().or(z.literal('')),
  purchaseOrderId: z.string().trim().optional().or(z.literal('')),
  supplierName: z.string().trim().min(1, 'Nama supplier wajib diisi'),
  subtotal: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0).default(0),
  dueDate: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const supplierPaymentSchema = z.object({
  supplierInvoiceId: z.string().trim().min(1, 'Invoice supplier wajib dipilih'),
  supplierId: z.string().trim().optional().or(z.literal('')),
  amount: z.coerce.number().min(0).default(0),
  method: z.enum(['CASH', 'CARD', 'QRIS', 'TRANSFER']).optional().default('TRANSFER'),
  referenceNo: z.string().trim().optional().or(z.literal('')),
});

export const warehouseTransferSchema = z.object({
  fromWarehouseId: z.string().trim().min(1, 'Warehouse asal wajib dipilih'),
  toWarehouseId: z.string().trim().min(1, 'Warehouse tujuan wajib dipilih'),
  requestedBy: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
  items: z.array(z.object({
    productId: z.string().trim().min(1, 'Produk wajib dipilih'),
    qty: z.coerce.number().int().min(1, 'Kuantitas wajib lebih dari 0'),
    batchNo: z.string().trim().optional().or(z.literal('')),
    notes: z.string().trim().optional().or(z.literal('')),
  })).min(1, 'Minimal satu item transfer'),
});

export const stockReturnSchema = z.object({
  type: z.enum(['SUPPLIER', 'CUSTOMER', 'INTERNAL']).default('SUPPLIER'),
  productId: z.string().trim().min(1, 'Produk wajib dipilih'),
  warehouseId: z.string().trim().optional().or(z.literal('')),
  batchId: z.string().trim().optional().or(z.literal('')),
  qty: z.coerce.number().int().min(1, 'Kuantitas wajib lebih dari 0'),
  reason: z.string().trim().min(1, 'Alasan wajib diisi'),
  requestedBy: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const disposalSchema = z.object({
  productId: z.string().trim().min(1, 'Produk wajib dipilih'),
  warehouseId: z.string().trim().optional().or(z.literal('')),
  batchId: z.string().trim().optional().or(z.literal('')),
  type: z.enum(['EXPIRED', 'DAMAGED', 'BROKEN', 'LOST', 'SHRINKAGE']).default('EXPIRED'),
  qty: z.coerce.number().int().min(1, 'Kuantitas wajib lebih dari 0'),
  reason: z.string().trim().min(1, 'Alasan wajib diisi'),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().trim().min(1, 'Produk wajib dipilih'),
  warehouseId: z.string().trim().optional().or(z.literal('')),
  delta: z.coerce.number().int(),
  notes: z.string().trim().min(1, 'Alasan wajib diisi'),
});

export const stockOpnameSchema = z.object({
  productId: z.string().trim().min(1, 'Produk wajib dipilih'),
  warehouseId: z.string().trim().optional().or(z.literal('')),
  delta: z.coerce.number().int(),
  notes: z.string().trim().min(1, 'Catatan opname wajib diisi'),
});

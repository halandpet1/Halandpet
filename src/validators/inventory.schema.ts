import { z } from 'zod';

export const productSchema = z.object({
  sku: z.string().trim().min(1, 'SKU wajib diisi'),
  name: z.string().trim().min(1, 'Nama produk wajib diisi'),
  type: z.enum(['MEDICINE', 'SUPPLEMENT', 'FOOD', 'ACCESSORY', 'SERVICE', 'OTHER']).optional().default('OTHER'),
  unit: z.string().trim().min(1, 'Satuan wajib diisi').default('pcs'),
  initialQty: z.coerce.number().int().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).default(0),
  basePrice: z.coerce.number().min(0).default(0),
  costPrice: z.coerce.number().min(0).default(0),
  requiresBatch: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export const purchaseOrderSchema = z.object({
  supplierName: z.string().trim().min(1, 'Supplier wajib diisi'),
  productId: z.string().trim().min(1, 'Produk wajib dipilih'),
  qty: z.coerce.number().int().min(1, 'Kuantitas wajib lebih dari 0'),
  unitPrice: z.coerce.number().min(0).default(0),
  expectedDate: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().trim().min(1, 'Produk wajib dipilih'),
  delta: z.coerce.number().int(),
  notes: z.string().trim().min(1, 'Alasan wajib diisi'),
});

export const stockOpnameSchema = z.object({
  productId: z.string().trim().min(1, 'Produk wajib dipilih'),
  delta: z.coerce.number().int(),
  notes: z.string().trim().min(1, 'Catatan opname wajib diisi'),
});

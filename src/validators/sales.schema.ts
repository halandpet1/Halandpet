import { z } from 'zod';

export const invoiceBillingSchema = z.object({
  id: z.string().trim().min(1, 'Invoice wajib dipilih'),
  status: z.enum(['DRAFT', 'PENDING', 'PARTIAL', 'PAID', 'VOID', 'REFUNDED']).default('PENDING'),
  dueDate: z.string().trim().optional().or(z.literal('')),
  paymentTerms: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const posCheckoutSchema = z.object({
  customerId: z.string().trim().optional().or(z.literal('')),
  items: z.array(z.object({
    productId: z.string().trim().min(1, 'Produk wajib dipilih'),
    qty: z.coerce.number().int().min(1, 'Kuantitas wajib lebih dari 0'),
    unitPrice: z.coerce.number().min(0).default(0),
  })).min(1, 'Minimal satu item checkout'),
  discount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'CARD', 'DEBIT', 'QRIS', 'TRANSFER']).default('CASH'),
  amountPaid: z.coerce.number().min(0).default(0),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const salesTransactionSchema = z.object({
  customerId: z.string().trim().optional().or(z.literal('')),
  items: z.array(z.object({
    productId: z.string().trim().min(1, 'Produk wajib dipilih'),
    qty: z.coerce.number().int().min(1, 'Kuantitas wajib lebih dari 0'),
    unitPrice: z.coerce.number().min(0).default(0),
  })).min(1, 'Minimal satu item transaksi'),
  discount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'CARD', 'DEBIT', 'QRIS', 'TRANSFER']).default('CASH'),
  amountPaid: z.coerce.number().min(0).default(0),
  notes: z.string().trim().optional().or(z.literal('')),
});

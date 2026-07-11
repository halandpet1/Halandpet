'use server';

import { db } from '@/lib/db';
import type { UserRole } from '@prisma/client';
import { parseOrFail, requireRole, type ActionResult } from '@/lib/action-utils';
import { z } from 'zod';

const reportRangeSchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom']).default('monthly'),
  startDate: z.string().optional().or(z.date().optional()),
  endDate: z.string().optional().or(z.date().optional()),
});

type ReportRange = {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  startDate?: Date;
  endDate?: Date;
};

async function assertRole() {
  return requireRole(['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF']);
}

function buildDateRange(range: ReportRange) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (range.period) {
    case 'daily':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'quarterly':
      start.setMonth(Math.floor(now.getMonth() / 3) * 3, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 2, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yearly':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    case 'custom':
      if (range.startDate) start.setTime(range.startDate.getTime());
      if (range.endDate) end.setTime(range.endDate.getTime());
      break;
  }

  return { start, end };
}

export async function getEnterpriseReportingSummary(rawData?: unknown): Promise<ActionResult<{ summary: { revenue: number; outstanding: number; appointments: number; bookings: number; customers: number }; series: Array<{ label: string; revenue: number; count: number }>; inventoryAlerts: Array<{ id: string; name: string; currentQty: number; minStock: number }> }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(reportRangeSchema, rawData ?? { period: 'monthly' });
  if (!parsed.success) return parsed;

  const range = buildDateRange({ period: parsed.data.period, startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined, endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined });

  const [invoices, products, appointments, hotelBookings, customerCount] = await Promise.all([
    db.invoice.findMany({ where: { deletedAt: null, createdAt: { gte: range.start, lte: range.end } }, select: { id: true, total: true, paidAmount: true, status: true, createdAt: true } }),
    db.product.findMany({ where: { deletedAt: null }, select: { id: true, name: true, currentQty: true, minStock: true, costPrice: true, sellingPrice: true } }),
    db.appointment.findMany({ where: { deletedAt: null, createdAt: { gte: range.start, lte: range.end } }, select: { id: true, status: true, appointmentDate: true } }),
    db.hotelBooking.findMany({ where: { deletedAt: null, createdAt: { gte: range.start, lte: range.end } }, select: { id: true, status: true, checkInDate: true, checkOutDate: true } }),
    db.customer.count({ where: { deletedAt: null } }),
  ]);

  const revenue = invoices.reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const outstanding = invoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.total) - Number(invoice.paidAmount)), 0);
  const series = [
    { label: 'Revenue', revenue, count: invoices.length },
    { label: 'Appointments', revenue: 0, count: appointments.length },
    { label: 'Bookings', revenue: 0, count: hotelBookings.length },
  ];
  const inventoryAlerts = products.filter((product) => product.currentQty <= (product.minStock ?? 0)).map((product) => ({ id: product.id, name: product.name, currentQty: product.currentQty, minStock: product.minStock ?? 0 }));

  return {
    success: true,
    data: {
      summary: {
        revenue,
        outstanding,
        appointments: appointments.length,
        bookings: hotelBookings.length,
        customers: customerCount,
      },
      series,
      inventoryAlerts,
    },
  };
}

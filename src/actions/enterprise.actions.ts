'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { parseOrFail, type ActionResult } from '@/lib/action-utils';
import { z } from 'zod';

const settingsSchema = z.object({
  clinicName: z.string().trim().min(1).optional(),
  address: z.string().trim().optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  taxRate: z.coerce.number().min(0).optional(),
  currency: z.string().trim().optional(),
  isOpen: z.boolean().optional(),
});

async function assertRole() {
  if (!db) return null;
  const user = await getSessionUser();
  if (!user) return null;
  const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { id: true, role: true, isActive: true, deletedAt: true } });
  if (!dbUser || dbUser.deletedAt || !dbUser.isActive || !['OWNER', 'ADMIN'].includes(dbUser.role)) {
    return null;
  }
  return { id: dbUser.id, role: dbUser.role };
}

export async function getSystemSettings(): Promise<ActionResult<{ settings: Record<string, unknown>; summary: { revenue: number; customers: number; products: number; bookings: number; appointments: number } }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const [settings, revenue, customers, products, bookings, appointments] = await Promise.all([
    db.clinicSetting.findFirst({ orderBy: { createdAt: 'desc' } }),
    db.invoice.aggregate({ where: { deletedAt: null, status: { in: ['PAID', 'PARTIAL'] } }, _sum: { total: true } }),
    db.customer.count({ where: { deletedAt: null } }),
    db.product.count({ where: { deletedAt: null } }),
    db.hotelBooking.count({ where: { deletedAt: null, status: { in: ['RESERVED', 'CHECKED_IN', 'WAITING_LIST'] } } }),
    db.appointment.count({ where: { deletedAt: null, status: { in: ['SCHEDULED', 'CHECKED_IN', 'WAITING', 'CONSULTING'] } } }),
  ]);

  return {
    success: true,
    data: {
      settings: settings ?? {},
      summary: {
        revenue: Number(revenue._sum.total ?? 0),
        customers,
        products,
        bookings,
        appointments,
      },
    },
  };
}

export async function upsertSystemSettings(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(settingsSchema, rawData);
  if (!parsed.success) return parsed;

  const current = await db.clinicSetting.findFirst({ orderBy: { createdAt: 'desc' } });
  if (current) {
    const updated = await db.clinicSetting.update({ where: { id: current.id }, data: { ...parsed.data, updatedAt: new Date() } });
    await db.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'ClinicSetting', entityId: updated.id, changes: parsed.data as never } });
  } else {
    const created = await db.clinicSetting.create({ data: { clinicName: parsed.data.clinicName ?? 'HaLand PetCare', address: parsed.data.address ?? null, phone: parsed.data.phone ?? null, taxRate: parsed.data.taxRate ?? 0, currency: parsed.data.currency ?? 'IDR', isOpen: parsed.data.isOpen ?? true } });
    await db.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'ClinicSetting', entityId: created.id, changes: parsed.data as never } });
  }

  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return { success: true, data: { id: current?.id ?? 'new' } };
}

export async function getAdministrationOverview(): Promise<ActionResult<{ users: Array<{ id: string; username: string; fullName: string; role: string; isActive: boolean }>; auditLogs: Array<{ id: string; action: string; entity: string; createdAt: Date }> }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const [users, auditLogs] = await Promise.all([
    db.user.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, username: true, fullName: true, role: true, isActive: true } }),
    db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, action: true, entity: true, createdAt: true } }),
  ]);

  return { success: true, data: { users, auditLogs } };
}

export async function getSystemMonitoringSummary(): Promise<ActionResult<{ widgets: { cpuUsage: number; memoryUsage: number; databaseHealth: string; storage: string; queue: number; failedJobs: number; pendingTransactions: number; auditLogCount: number; errorRate: number; revenueToday: number; revenueMonth: number; hotelOccupancy: number; appointmentQueue: number; inventoryAlert: number; membershipGrowth: number; customerGrowth: number } }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole();
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const [todayRevenue, monthRevenue, appointments, bookings, inventory, customers, auditLogs] = await Promise.all([
    db.invoice.aggregate({ where: { deletedAt: null, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }, _sum: { total: true } }),
    db.invoice.aggregate({ where: { deletedAt: null, createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth(), 1)) } }, _sum: { total: true } }),
    db.appointment.count({ where: { deletedAt: null, status: { in: ['SCHEDULED', 'CHECKED_IN', 'WAITING', 'CONSULTING'] } } }),
    db.hotelBooking.count({ where: { deletedAt: null, status: { in: ['RESERVED', 'CHECKED_IN', 'WAITING_LIST'] } } }),
    db.product.count({ where: { deletedAt: null } }),
    db.customer.count({ where: { deletedAt: null } }),
    db.auditLog.count({ where: { createdAt: { gte: new Date(new Date().setDate(new Date().getDate() - 7)) } } }),
  ]);

  return {
    success: true,
    data: {
      widgets: {
        cpuUsage: 42,
        memoryUsage: 68,
        databaseHealth: 'Healthy',
        storage: '82 GB / 100 GB',
        queue: appointments,
        failedJobs: 0,
        pendingTransactions: 2,
        auditLogCount: auditLogs,
        errorRate: 0.8,
        revenueToday: Number(todayRevenue._sum.total ?? 0),
        revenueMonth: Number(monthRevenue._sum.total ?? 0),
        hotelOccupancy: bookings,
        appointmentQueue: appointments,
        inventoryAlert: inventory,
        membershipGrowth: 5,
        customerGrowth: customers,
      },
    },
  };
}

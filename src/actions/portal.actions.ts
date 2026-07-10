'use server';

import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { parseOrFail } from '@/lib/action-utils';
import { z } from 'zod';

type CustomerPortalCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isWalkIn: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CustomerPortalPet = {
  id: string;
  name: string;
  species: { name: string } | null;
  createdAt: Date;
};

type CustomerPortalAppointment = {
  id: string;
  status: string;
  appointmentDate: Date;
  pet: { name: string } | null;
};

type CustomerPortalInvoice = {
  id: string;
  invoiceNo: string;
  status: string;
  total: number;
  createdAt: Date;
};

type CustomerPortalHotelBooking = {
  id: string;
  bookingNo: string;
  status: string;
  checkInDate: Date | null;
  checkOutDate: Date | null;
};

type CustomerPortalOverview = {
  customer: CustomerPortalCustomer;
  pets: CustomerPortalPet[];
  appointments: CustomerPortalAppointment[];
  invoices: CustomerPortalInvoice[];
  hotelBookings: CustomerPortalHotelBooking[];
};

type CustomerPortalReminder = {
  id: string;
  title: string;
  message: string;
  type: string;
  dueDate: string;
};

type CustomerPortalResult =
  | { success: true; data: CustomerPortalOverview }
  | { success: false; error: string };

type CustomerPortalReminderResult =
  | { success: true; data: { reminders: CustomerPortalReminder[] } }
  | { success: false; error: string };

type CustomerPortalNotificationResult =
  | { success: true; data: { items: Array<{ id: string; title: string; message: string; isRead: boolean; createdAt: Date }> } }
  | { success: false; error: string };

const profileSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().optional().or(z.literal('')),
  email: z.string().trim().email().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
});

async function getPortalCustomerContext() {
  if (!db) return null;

  const user = await getSessionUser();
  if (!user) return null;

  const customer = await db.customer.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      isWalkIn: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return customer ? { user, customer } : null;
}

export async function getCustomerPortalOverview(): Promise<CustomerPortalResult> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const context = await getPortalCustomerContext();
  if (!context?.customer) {
    return { success: false, error: 'Akses portal pelanggan tidak tersedia' };
  }

  const [pets, appointments, invoices, hotelBookings] = await Promise.all([
    db.pet.findMany({
      where: { customerId: context.customer.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, species: { select: { name: true } }, createdAt: true },
    }),
    db.appointment.findMany({
      where: { customerId: context.customer.id, deletedAt: null },
      orderBy: { appointmentDate: 'desc' },
      take: 5,
      select: { id: true, status: true, appointmentDate: true, pet: { select: { name: true } } },
    }),
    db.invoice.findMany({
      where: { customerId: context.customer.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, invoiceNo: true, status: true, total: true, createdAt: true },
    }),
    db.hotelBooking.findMany({
      where: { customerId: context.customer.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, bookingNo: true, status: true, checkInDate: true, checkOutDate: true },
    }),
  ]);

  return {
    success: true,
    data: {
      customer: context.customer,
      pets: pets as CustomerPortalPet[],
      appointments: appointments as CustomerPortalAppointment[],
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNo: invoice.invoiceNo,
        status: invoice.status,
        total: Number(invoice.total),
        createdAt: invoice.createdAt,
      })),
      hotelBookings: hotelBookings as CustomerPortalHotelBooking[],
    },
  };
}

export async function updateCustomerPortalProfile(rawData: unknown): Promise<CustomerPortalResult> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const context = await getPortalCustomerContext();
  if (!context?.customer) {
    return { success: false, error: 'Akses portal pelanggan tidak tersedia' };
  }

  const parsed = await parseOrFail(profileSchema, rawData);
  if (!parsed.success) return parsed;

  const updated = await db.customer.update({
    where: { id: context.customer.id },
    data: {
      name: parsed.data.name?.trim() || context.customer.name,
      phone: parsed.data.phone?.trim() || null,
      email: parsed.data.email?.trim() || null,
      address: parsed.data.address?.trim() || null,
      updatedAt: new Date(),
    },
  });

  await db.auditLog.create({
    data: {
      userId: context.user.id,
      action: 'UPDATE',
      entity: 'Customer',
      entityId: updated.id,
      changes: parsed.data as Prisma.InputJsonValue,
    },
  });

  return { success: true, data: { customer: { ...context.customer, ...updated }, pets: [], appointments: [], invoices: [], hotelBookings: [] } };
}

export async function getCustomerPortalReminders(): Promise<CustomerPortalReminderResult> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const context = await getPortalCustomerContext();
  if (!context?.customer) {
    return { success: false, error: 'Akses portal pelanggan tidak tersedia' };
  }

  const now = new Date();
  const future = new Date();
  future.setDate(now.getDate() + 14);

  const [appointments, hotelBookings, vaccinations] = await Promise.all([
    db.appointment.findMany({ where: { customerId: context.customer.id, deletedAt: null, appointmentDate: { gte: now, lte: future } }, orderBy: { appointmentDate: 'asc' }, take: 5, select: { id: true, appointmentDate: true, status: true, pet: { select: { name: true } } } }),
    db.hotelBooking.findMany({ where: { customerId: context.customer.id, deletedAt: null, checkInDate: { gte: now, lte: future } }, orderBy: { checkInDate: 'asc' }, take: 5, select: { id: true, bookingNo: true, checkInDate: true, status: true } }),
    db.vaccinationRecord.findMany({ where: { pet: { customerId: context.customer.id } }, orderBy: { nextDueDate: 'asc' }, take: 5, select: { id: true, vaccineName: true, nextDueDate: true } }),
  ]);

  const reminders: CustomerPortalReminder[] = [
    ...appointments.map((item) => ({ id: `apt-${item.id}`, title: 'Janji temu', message: `${item.pet?.name ?? 'Hewan'} • ${item.status}`, type: 'APPOINTMENT', dueDate: item.appointmentDate.toISOString() })),
    ...hotelBookings.map((item) => ({ id: `hotel-${item.id}`, title: 'Hotel booking', message: `${item.bookingNo} • ${item.status}`, type: 'HOTEL', dueDate: item.checkInDate?.toISOString() ?? '' })),
    ...vaccinations.map((item) => ({ id: `vac-${item.id}`, title: 'Vaksin', message: item.vaccineName, type: 'VACCINATION', dueDate: item.nextDueDate?.toISOString() ?? '' })),
  ];

  return { success: true, data: { reminders } };
}

export async function listCustomerNotifications(): Promise<CustomerPortalNotificationResult> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const context = await getPortalCustomerContext();
  if (!context?.customer) {
    return { success: false, error: 'Akses portal pelanggan tidak tersedia' };
  }

  const items = await db.notification.findMany({
    where: { userId: context.user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, title: true, message: true, isRead: true, createdAt: true },
  });

  return { success: true, data: { items } };
}

export async function markCustomerNotificationRead(id: string) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const context = await getPortalCustomerContext();
  if (!context?.customer) {
    return { success: false, error: 'Akses portal pelanggan tidak tersedia' };
  }

  const updated = await db.notification.update({ where: { id }, data: { isRead: true } });
  await db.auditLog.create({ data: { userId: context.user.id, action: 'UPDATE', entity: 'Notification', entityId: updated.id, changes: { isRead: true } as Prisma.InputJsonValue } });
  return { success: true, data: { id: updated.id } };
}

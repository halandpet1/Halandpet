'use server';

import { Prisma, type UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { customerSchema, customerUpdateSchema, petSchema, petUpdateSchema, speciesSchema, breedSchema, colorSchema } from '@/validators/customer.schema';
import { parseOrFail, revalidateCustomerViews, requireRole, type ActionResult } from '@/lib/action-utils';

const customerCreateRoles: UserRole[] = ['OWNER', 'ADMIN'];
const petCreateRoles: UserRole[] = ['OWNER', 'ADMIN', 'DOCTOR'];
const staffViewRoles: UserRole[] = ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF'];

async function assertRole(allowedRoles: UserRole[]) {
  const user = await requireRole(allowedRoles);
  if (!user) {
    return null;
  }

  return user;
}

export async function createCustomer(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole(customerCreateRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(customerSchema, rawData);
  if (!parsed.success) return parsed;

  const customer = await db.$transaction(async (tx) => {
    const created = await tx.customer.create({
      data: {
        ...parsed.data,
        name: parsed.data.name.trim(),
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        address: parsed.data.address || null,
        notes: parsed.data.notes || null,
        isWalkIn: parsed.data.isWalkIn ?? false,
        createdBy: actor.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: 'CREATE',
        entity: 'Customer',
        entityId: created.id,
        changes: parsed.data as Prisma.InputJsonValue,
      },
    });

    return created;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: customer.id } };
}

export async function updateCustomer(id: string, rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole(customerCreateRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(customerUpdateSchema, rawData);
  if (!parsed.success) return parsed;

  const customer = await db.$transaction(async (tx) => {
    const updated = await tx.customer.update({
      where: { id },
      data: {
        ...parsed.data,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        address: parsed.data.address || null,
        notes: parsed.data.notes || null,
        updatedBy: actor.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: 'UPDATE',
        entity: 'Customer',
        entityId: updated.id,
        changes: parsed.data as Prisma.InputJsonValue,
      },
    });

    return updated;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: customer.id } };
}

export async function softDeleteCustomer(id: string): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole(customerCreateRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const deletedAt = new Date();
  const customer = await db.$transaction(async (tx) => {
    const updated = await tx.customer.update({
      where: { id },
      data: { deletedAt, updatedBy: actor.id },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: 'SOFT_DELETE',
        entity: 'Customer',
        entityId: updated.id,
        changes: { deletedAt } as Prisma.InputJsonValue,
      },
    });

    return updated;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: customer.id } };
}

export async function restoreCustomer(id: string): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole(customerCreateRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const customer = await db.$transaction(async (tx) => {
    const updated = await tx.customer.update({
      where: { id },
      data: { deletedAt: null, updatedBy: actor.id },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: 'RESTORE',
        entity: 'Customer',
        entityId: updated.id,
        changes: { deletedAt: null } as Prisma.InputJsonValue,
      },
    });

    return updated;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: customer.id } };
}

export async function listCustomers(params?: { search?: string; page?: number; pageSize?: number }) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole(staffViewRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const search = params?.search?.trim();
  const customerScope = actor.role === 'CUSTOMER'
    ? await db.customer.findFirst({ where: { userId: actor.id, deletedAt: null }, select: { id: true } })
    : null;
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;

  const where = {
    deletedAt: null,
    ...(customerScope ? { id: customerScope.id } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, name: true, phone: true, email: true, address: true, notes: true, isWalkIn: true, createdAt: true, updatedAt: true },
    }),
    db.customer.count({ where }),
  ]);

  return { success: true, data: { items, total, page, pageSize } };
}

export async function getCustomerById(id: string) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole(staffViewRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const customerScope = actor.role === 'CUSTOMER'
    ? await db.customer.findFirst({ where: { userId: actor.id, deletedAt: null }, select: { id: true } })
    : null;

  const customer = await db.customer.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(customerScope ? { id: customerScope.id } : {}),
    },
    select: { id: true, name: true, phone: true, email: true, address: true, notes: true, isWalkIn: true, createdAt: true, updatedAt: true },
  });
  return customer ? { success: true, data: customer } : { success: false, error: 'Customer tidak ditemukan' };
}

export async function createPet(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole(petCreateRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(petSchema, rawData);
  if (!parsed.success) return parsed;

  const pet = await db.$transaction(async (tx) => {
    const created = await tx.pet.create({
      data: {
        ...parsed.data,
        customerId: parsed.data.customerId,
        speciesId: parsed.data.speciesId,
        breedId: parsed.data.breedId || null,
        colorId: parsed.data.colorId || null,
        dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
        microchipNumber: parsed.data.microchipNumber || null,
        photoUrl: parsed.data.photoUrl || null,
        notes: parsed.data.notes || null,
        createdBy: actor.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: 'CREATE',
        entity: 'Pet',
        entityId: created.id,
        changes: parsed.data as Prisma.InputJsonValue,
      },
    });

    return created;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: pet.id } };
}

export async function updatePet(id: string, rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole(petCreateRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const parsed = await parseOrFail(petUpdateSchema, rawData);
  if (!parsed.success) return parsed;

  const pet = await db.$transaction(async (tx) => {
    const updated = await tx.pet.update({
      where: { id },
      data: {
        ...parsed.data,
        breedId: parsed.data.breedId || null,
        colorId: parsed.data.colorId || null,
        dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
        microchipNumber: parsed.data.microchipNumber || null,
        photoUrl: parsed.data.photoUrl || null,
        notes: parsed.data.notes || null,
        updatedBy: actor.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: 'UPDATE',
        entity: 'Pet',
        entityId: updated.id,
        changes: parsed.data as Prisma.InputJsonValue,
      },
    });

    return updated;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: pet.id } };
}

export async function softDeletePet(id: string): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole(petCreateRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const deletedAt = new Date();
  const pet = await db.$transaction(async (tx) => {
    const updated = await tx.pet.update({ where: { id }, data: { deletedAt, updatedBy: actor.id } });
    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: 'SOFT_DELETE',
        entity: 'Pet',
        entityId: updated.id,
        changes: { deletedAt } as Prisma.InputJsonValue,
      },
    });
    return updated;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: pet.id } };
}

export async function restorePet(id: string): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole(petCreateRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const pet = await db.$transaction(async (tx) => {
    const updated = await tx.pet.update({ where: { id }, data: { deletedAt: null, updatedBy: actor.id } });
    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: 'RESTORE',
        entity: 'Pet',
        entityId: updated.id,
        changes: { deletedAt: null } as Prisma.InputJsonValue,
      },
    });
    return updated;
  });

  await revalidateCustomerViews();
  return { success: true, data: { id: pet.id } };
}

export async function listPets(params?: { customerId?: string; search?: string; page?: number; pageSize?: number }) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole(staffViewRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const search = params?.search?.trim();
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  const customerScope = actor.role === 'CUSTOMER'
    ? await db.customer.findFirst({ where: { userId: actor.id, deletedAt: null }, select: { id: true } })
    : null;
  const where = {
    deletedAt: null,
    ...(customerScope ? { customerId: customerScope.id } : {}),
    ...(actor.role !== 'CUSTOMER' && params?.customerId ? { customerId: params.customerId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { microchipNumber: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.pet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        customerId: true,
        speciesId: true,
        breedId: true,
        colorId: true,
        gender: true,
        dateOfBirth: true,
        microchipNumber: true,
        photoUrl: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        customer: { select: { id: true, name: true } },
        species: { select: { id: true, name: true } },
        breed: { select: { id: true, name: true } },
        color: { select: { id: true, name: true } },
      },
    }),
    db.pet.count({ where }),
  ]);

  return { success: true, data: { items, total, page, pageSize } };
}

export async function getPetById(id: string) {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };

  const actor = await assertRole(staffViewRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };

  const customerScope = actor.role === 'CUSTOMER'
    ? await db.customer.findFirst({ where: { userId: actor.id, deletedAt: null }, select: { id: true } })
    : null;

  const pet = await db.pet.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(customerScope ? { customerId: customerScope.id } : {}),
    },
    select: {
      id: true,
      name: true,
      customerId: true,
      speciesId: true,
      breedId: true,
      colorId: true,
      gender: true,
      dateOfBirth: true,
      microchipNumber: true,
      photoUrl: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      customer: { select: { id: true, name: true } },
      species: { select: { id: true, name: true } },
      breed: { select: { id: true, name: true } },
      color: { select: { id: true, name: true } },
    },
  });
  return pet ? { success: true, data: pet } : { success: false, error: 'Hewan tidak ditemukan' };
}

export async function listSpecies() {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(staffViewRoles);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };
  const items = await db.species.findMany({ where: { deletedAt: null, isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, isActive: true } });
  return { success: true, data: items };
}

export async function createSpecies(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(['OWNER', 'ADMIN', 'STAFF']);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };
  const parsed = await parseOrFail(speciesSchema, rawData);
  if (!parsed.success) return parsed;
  const item = await db.$transaction(async (tx) => {
    const created = await tx.species.create({ data: { ...parsed.data, name: parsed.data.name.trim() } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Species', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
    return created;
  });
  return { success: true, data: { id: item.id } };
}

export async function createBreed(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(['OWNER', 'ADMIN', 'STAFF']);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };
  const parsed = await parseOrFail(breedSchema, rawData);
  if (!parsed.success) return parsed;
  const item = await db.$transaction(async (tx) => {
    const created = await tx.breed.create({ data: { ...parsed.data, name: parsed.data.name.trim() } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Breed', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
    return created;
  });
  return { success: true, data: { id: item.id } };
}

export async function createColor(rawData: unknown): Promise<ActionResult<{ id: string }>> {
  if (!db) return { success: false, error: 'Database belum dikonfigurasi' };
  const actor = await assertRole(['OWNER', 'ADMIN', 'STAFF']);
  if (!actor) return { success: false, error: 'Tidak diizinkan' };
  const parsed = await parseOrFail(colorSchema, rawData);
  if (!parsed.success) return parsed;
  const item = await db.$transaction(async (tx) => {
    const created = await tx.color.create({ data: { ...parsed.data, name: parsed.data.name.trim() } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Color', entityId: created.id, changes: parsed.data as Prisma.InputJsonValue } });
    return created;
  });
  return { success: true, data: { id: item.id } };
}

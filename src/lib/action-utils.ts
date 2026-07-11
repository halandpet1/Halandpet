import type { Prisma, UserRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { z } from 'zod';

export async function requireSessionUser() {
  if (!db) {
    return null;
  }

  return getSessionUser();
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireSessionUser();
  if (!user) {
    return null;
  }

  const dbUser = await db?.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, isActive: true, deletedAt: true },
  });

  if (!dbUser || dbUser.deletedAt || !dbUser.isActive || !allowedRoles.includes(dbUser.role)) {
    return null;
  }

  return {
    id: dbUser.id,
    role: dbUser.role,
    fullName: user.fullName,
  };
}

export async function logAudit(action: string, entity: string, entityId: string, userId: string | null, changes: Prisma.InputJsonValue) {
  if (!db) return;

  await db.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      changes,
    },
  });
}

export async function revalidateCustomerViews() {
  revalidatePath('/customers');
  revalidatePath('/pets');
  revalidatePath('/dashboard');
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

function normalizeFieldErrors(error: z.ZodError): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(issue.message);
  }

  return grouped;
}

export async function parseOrFail<T>(schema: z.ZodType<T>, rawData: unknown): Promise<ActionResult<T>> {
  const parsed = schema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: normalizeFieldErrors(parsed.error),
    };
  }

  return { success: true, data: parsed.data };
}

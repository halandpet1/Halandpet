'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { hashPin, verifyPin } from '@/lib/auth';
import { setSessionCookie } from '@/lib/session';
import { usernameSchema, pinSchema } from '@/validators/common.schema';
import { z } from 'zod';

const loginSchema = z.object({
  username: usernameSchema,
  pin: pinSchema,
});

export async function loginAction(rawData: FormData | Record<string, unknown>) {
  if (!db) {
    return { success: false, error: 'Database belum dikonfigurasi' };
  }

  const data = rawData instanceof FormData ? Object.fromEntries(rawData.entries()) : rawData;
  const parsed = loginSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: 'Data login tidak valid', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const user = await db.user.findFirst({
    where: { username: parsed.data.username, deletedAt: null },
  });

  if (!user) {
    return { success: false, error: 'Username atau PIN tidak valid' };
  }

  const isValid = await verifyPin(parsed.data.pin, user.pinHash);
  if (!isValid) {
    return { success: false, error: 'Username atau PIN tidak valid' };
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), mustChangePin: false },
  });

  await setSessionCookie({ id: user.id, role: user.role, fullName: user.fullName });
  redirect('/dashboard');
}

export async function createOwnerAction() {
  if (!db) {
    return { success: false, error: 'Database belum dikonfigurasi' };
  }

  const existing = await db.user.findFirst({ where: { role: 'OWNER' } });
  if (existing) {
    return { success: false, error: 'Owner sudah ada' };
  }

  const pin = '123456';
  const owner = await db.user.create({
    data: {
      username: 'owner',
      pinHash: await hashPin(pin),
      fullName: 'Owner HaLand',
      role: 'OWNER',
      mustChangePin: true,
    },
  });

  return { success: true, data: { ...owner, pin } };
}

'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { hashPin, verifyPin } from '@/lib/auth';
import { setSessionCookie } from '@/lib/session';
import { checkRateLimit } from '@/lib/rate-limit';
import { usernameSchema, pinSchema } from '@/validators/common.schema';
import { ensureDevelopmentSeed, getDevelopmentAuthUser, verifyDevelopmentPin } from '@/lib/dev-auth';
import { z } from 'zod';

const loginSchema = z.object({
  username: usernameSchema,
  pin: pinSchema,
});

export async function loginAction(rawData: FormData | Record<string, unknown>) {
  const data = rawData instanceof FormData ? Object.fromEntries(rawData.entries()) : rawData;
  const parsed = loginSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: 'Data login tidak valid', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const rateLimitKey = `login:${parsed.data.username.toLowerCase()}`;
  const rateLimitResult = await checkRateLimit(rateLimitKey, { max: 5, windowMs: 60_000 });
  if (!rateLimitResult.allowed) {
    return { success: false, error: `Terlalu banyak percobaan login. Silakan coba lagi dalam ${Math.ceil(rateLimitResult.retryAfterMs / 1000)} detik.` };
  }

  let user;
  if (!db) {
    await ensureDevelopmentSeed();
    user = await getDevelopmentAuthUser(parsed.data.username);
    if (!user) {
      return { success: false, error: 'Username atau PIN tidak valid' };
    }
  } else {
    user = await db.user.findFirst({
      where: { username: parsed.data.username, deletedAt: null },
    });

    if (!user) {
      return { success: false, error: 'Username atau PIN tidak valid' };
    }
  }

  const isValid = db
    ? await verifyPin(parsed.data.pin, user.pinHash)
    : await verifyDevelopmentPin(parsed.data.username, parsed.data.pin);
  if (!isValid) {
    return { success: false, error: 'Username atau PIN tidak valid' };
  }

  if (db) {
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), mustChangePin: false },
    });
  }

  await setSessionCookie({ id: user.id, role: user.role, fullName: user.fullName });
  redirect(user.role === 'CUSTOMER' ? '/portal' : '/');
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

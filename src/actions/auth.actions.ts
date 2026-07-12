'use server';

import { db } from '@/lib/db';
import { hashPin, verifyPin } from '@/lib/auth';
import { getSessionUser, setSessionCookie } from '@/lib/session';
import { checkRateLimit } from '@/lib/rate-limit';
import { usernameSchema, pinSchema } from '@/validators/common.schema';
import { ensureDevelopmentSeed, getDevelopmentAuthUser, verifyDevelopmentPin } from '@/lib/dev-auth';
import { getRoleRedirectPath } from '@/lib/role-access';
import { withActiveFilter } from '@/lib/soft-delete';
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
      where: withActiveFilter({ username: parsed.data.username, isActive: true }),
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
      data: { lastLoginAt: new Date(), mustChangePin: Boolean(user.mustChangePin) ? true : false },
    });
  }

  if (user.mustChangePin) {
    return {
      success: true,
      data: {
        redirectTo: getRoleRedirectPath(user.role),
        role: user.role,
        mustChangePin: true,
      },
    };
  }

  await setSessionCookie({ id: user.id, role: user.role, fullName: user.fullName });

  return {
    success: true,
    data: {
      redirectTo: getRoleRedirectPath(user.role),
      role: user.role,
      mustChangePin: false,
    },
  };
}

export async function changePinAction(rawData: FormData | Record<string, unknown>) {
  const data = rawData instanceof FormData ? Object.fromEntries(rawData.entries()) : rawData;
  const parsed = z.object({ currentPin: pinSchema, newPin: pinSchema }).safeParse(data);

  if (!parsed.success) {
    return { success: false, error: 'Data PIN tidak valid', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  if (!db) {
    return { success: false, error: 'Database belum dikonfigurasi' };
  }

  const currentSession = await getSessionUser();
  if (!currentSession?.id) {
    return { success: false, error: 'Sesi tidak valid' };
  }

  const sessionUser = await db.user.findFirst({ where: withActiveFilter({ id: currentSession.id }), select: { id: true, pinHash: true, mustChangePin: true } });
  if (!sessionUser) {
    return { success: false, error: 'Pengguna tidak ditemukan' };
  }

  const isCurrentPinValid = await verifyPin(parsed.data.currentPin, sessionUser.pinHash);
  if (!isCurrentPinValid) {
    return { success: false, error: 'PIN saat ini tidak valid' };
  }

  await db.user.update({
    where: { id: sessionUser.id },
    data: {
      pinHash: await hashPin(parsed.data.newPin),
      mustChangePin: false,
      updatedAt: new Date(),
    },
  });

  return { success: true, data: { updated: true } };
}


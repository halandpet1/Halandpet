import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPin } from '@/lib/auth';
import { setSessionCookie } from '@/lib/session';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const body = await request.json();
  const username = typeof body?.username === 'string' ? body.username : '';
  const pin = typeof body?.pin === 'string' ? body.pin : '';
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';

  if (!db) {
    return NextResponse.json({ success: false, error: 'Database belum dikonfigurasi' }, { status: 500 });
  }

  const rateLimit = await checkRateLimit(`login:${ip}`, 5, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Terlalu banyak percobaan login. Coba lagi sebentar lagi.' },
      { status: 429 },
    );
  }

  const user = await db.user.findFirst({ where: { username, deletedAt: null } });
  if (!user) {
    return NextResponse.json({ success: false, error: 'Username atau PIN tidak valid' }, { status: 401 });
  }

  const isValid = await verifyPin(pin, user.pinHash);
  if (!isValid) {
    return NextResponse.json({ success: false, error: 'Username atau PIN tidak valid' }, { status: 401 });
  }

  await setSessionCookie({ id: user.id, role: user.role, fullName: user.fullName });
  return NextResponse.json({ success: true });
}

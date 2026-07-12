import { NextResponse } from 'next/server';
import { loginAction } from '@/actions/auth.actions';

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Request body tidak valid' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ success: false, error: 'Request body tidak valid' }, { status: 400 });
  }

  const parsedBody = body as Record<string, unknown>;
  const username = typeof parsedBody.username === 'string' ? parsedBody.username.trim() : '';
  const pin = typeof parsedBody.pin === 'string' ? parsedBody.pin : '';

  const result = await loginAction({ username, pin });
  if (!result.success) {
    const errorMessage = result.error ?? 'Login gagal';
    const status = errorMessage.includes('Terlalu banyak') ? 429 : 401;
    return NextResponse.json({ success: false, error: errorMessage }, { status });
  }

  return NextResponse.json({ success: true, data: result.data });
}

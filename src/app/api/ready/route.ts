import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  if (!db) {
    return NextResponse.json({ status: 'degraded', reason: 'database-unavailable' }, { status: 503 });
  }

  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ready' });
  } catch {
    return NextResponse.json({ status: 'degraded', reason: 'database-unavailable' }, { status: 503 });
  }
}

export async function POST() {
  return NextResponse.json({ status: 'error', error: 'Method not allowed' }, { status: 405 });
}

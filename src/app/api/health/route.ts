import { NextResponse } from 'next/server';
import { validateProductionEnvironment } from '@/lib/runtime';

export async function GET() {
  validateProductionEnvironment();
  return NextResponse.json({ status: 'ok' });
}

export async function POST() {
  validateProductionEnvironment();
  return NextResponse.json({ status: 'error', error: 'Method not allowed' }, { status: 405 });
}

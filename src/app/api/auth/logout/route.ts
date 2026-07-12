import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/session';

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 });
}

import { clearSessionCookie } from '@/lib/session';
import { jsonMethodNotAllowed, jsonResponse } from '@/lib/api-response';

export async function POST() {
  await clearSessionCookie();
  return jsonResponse({ success: true });
}

export async function GET() {
  return jsonMethodNotAllowed();
}

export async function PUT() {
  return jsonMethodNotAllowed();
}

export async function PATCH() {
  return jsonMethodNotAllowed();
}

export async function DELETE() {
  return jsonMethodNotAllowed();
}

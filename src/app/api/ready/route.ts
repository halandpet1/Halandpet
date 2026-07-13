import { db } from '@/lib/db';
import { jsonMethodNotAllowed, jsonResponse } from '@/lib/api-response';

export async function GET() {
  if (!db) {
    return jsonResponse({ status: 'degraded', reason: 'database-unavailable' }, { status: 503 });
  }

  try {
    await db.$queryRaw`SELECT 1`;
    return jsonResponse({ status: 'ready' });
  } catch {
    return jsonResponse({ status: 'degraded', reason: 'database-unavailable' }, { status: 503 });
  }
}

export async function POST() {
  return jsonMethodNotAllowed();
}

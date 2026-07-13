import { jsonMethodNotAllowed, jsonResponse } from '@/lib/api-response';

export async function GET() {
  return jsonResponse({ status: 'alive' });
}

export async function POST() {
  return jsonMethodNotAllowed();
}

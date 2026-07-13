import { validateProductionEnvironment } from '@/lib/runtime';
import { jsonMethodNotAllowed, jsonResponse } from '@/lib/api-response';

export async function GET() {
  validateProductionEnvironment();
  return jsonResponse({ status: 'ok' });
}

export async function POST() {
  validateProductionEnvironment();
  return jsonMethodNotAllowed();
}

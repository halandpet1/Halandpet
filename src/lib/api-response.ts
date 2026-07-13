import { NextResponse } from 'next/server';

export function jsonResponse<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, init);
}

export function jsonError(message: string, status = 500) {
  return jsonResponse({ success: false, error: message }, { status });
}

export function jsonMethodNotAllowed() {
  return jsonError('Method not allowed', 405);
}

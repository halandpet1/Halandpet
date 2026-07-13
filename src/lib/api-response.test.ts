import { describe, expect, it } from 'vitest';
import { jsonError, jsonMethodNotAllowed, jsonResponse } from './api-response';

describe('api response helpers', () => {
  it('creates a standard error response body and status', async () => {
    const response = jsonError('Request body tidak valid', 400);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: 'Request body tidak valid' });
  });

  it('creates a method-not-allowed response', async () => {
    const response = jsonMethodNotAllowed();

    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ success: false, error: 'Method not allowed' });
  });

  it('passes through the provided response body', async () => {
    const response = jsonResponse({ ok: true });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});

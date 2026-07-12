import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('auth login route', () => {
  it('rejects malformed json bodies with a 400 response', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{invalid json',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false, error: 'Request body tidak valid' });
  });

  it('rejects non-object payloads with a 400 response', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '"bad"',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false, error: 'Request body tidak valid' });
  });
});

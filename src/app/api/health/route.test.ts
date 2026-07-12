import { describe, expect, it } from 'vitest';

import { GET, POST } from './route';

describe('health endpoint', () => {
  it('returns ok', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'ok' });
  });

  it('rejects non-GET requests', async () => {
    const response = await POST();
    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toMatchObject({ status: 'error', error: 'Method not allowed' });
  });
});

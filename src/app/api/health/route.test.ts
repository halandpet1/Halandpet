import { describe, expect, it } from 'vitest';

import { GET } from './route';

describe('health endpoint', () => {
  it('returns ok', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ db: dbMock }));

import { GET } from './route';

describe('ready endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 503 when the database query fails', async () => {
    dbMock.$queryRaw.mockRejectedValue(new Error('db down'));

    const response = await GET();
    expect(response.status).toBe(503);
  });

  it('returns 200 when the database query succeeds', async () => {
    dbMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const response = await GET();
    expect(response.status).toBe(200);
  });
});

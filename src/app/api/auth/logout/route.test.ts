import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const cookiesMock = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({ cookies: cookiesMock }));

describe('auth logout route', () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    cookiesMock.mockResolvedValue({ set: vi.fn() });
  });

  it('returns success for a valid logout request', async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
  });
});

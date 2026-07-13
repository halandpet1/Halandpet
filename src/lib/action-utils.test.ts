import { beforeEach, describe, expect, it, vi } from 'vitest';

const loggerErrorMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/logger', () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

import { withActionErrorHandling } from './action-utils';

describe('withActionErrorHandling', () => {
  beforeEach(() => {
    loggerErrorMock.mockReset();
  });

  it('returns a consistent failure payload when an action throws', async () => {
    const result = await withActionErrorHandling('testAction', async () => {
      throw new Error('boom');
    });

    expect(result).toEqual({ success: false, error: 'Terjadi kesalahan, coba lagi' });
    expect(loggerErrorMock).toHaveBeenCalledWith('testAction failed', {
      action: 'testAction',
      error: expect.any(Error),
    });
  });

  it('returns the handler result when the action succeeds', async () => {
    const result = await withActionErrorHandling('testAction', async () => ({ success: true as const, data: { ok: true } }));

    expect(result).toEqual({ success: true, data: { ok: true } });
    expect(loggerErrorMock).not.toHaveBeenCalled();
  });
});

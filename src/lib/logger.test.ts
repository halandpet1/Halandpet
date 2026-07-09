import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from './logger';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits structured logs without throwing', () => {
    expect(() => logger.info('ok', { scope: 'test' })).not.toThrow();
  });
});

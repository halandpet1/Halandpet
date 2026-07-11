import { beforeEach, describe, expect, it } from 'vitest';
import { ensureDevelopmentSeed, getDevelopmentAuthUser, resetDevelopmentSeedForTests } from './dev-auth';

describe('development auth fallback', () => {
  beforeEach(() => {
    resetDevelopmentSeedForTests();
    delete process.env.DATABASE_URL;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
  });

  it('creates a fallback owner for local development when no database is configured', async () => {
    const seed = await ensureDevelopmentSeed();

    expect(seed).toMatchObject({
      username: 'owner',
      role: 'OWNER',
      fullName: 'Owner HaLand',
    });

    const user = await getDevelopmentAuthUser('owner');
    expect(user).toMatchObject({
      username: 'owner',
      role: 'OWNER',
    });
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateProductionEnvironment } from './runtime';

const setProcessEnv = (key: string, value?: string) => {
  const original = process.env[key];
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
  return original;
};

describe('validateProductionEnvironment', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSessionSecret = process.env.SESSION_SECRET;
  const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    setProcessEnv('SESSION_SECRET');
    setProcessEnv('NEXTAUTH_SECRET');
    setProcessEnv('DATABASE_URL');
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      setProcessEnv('NODE_ENV');
    } else {
      setProcessEnv('NODE_ENV', originalNodeEnv);
    }

    if (originalSessionSecret === undefined) {
      setProcessEnv('SESSION_SECRET');
    } else {
      setProcessEnv('SESSION_SECRET', originalSessionSecret);
    }

    if (originalNextAuthSecret === undefined) {
      setProcessEnv('NEXTAUTH_SECRET');
    } else {
      setProcessEnv('NEXTAUTH_SECRET', originalNextAuthSecret);
    }

    if (originalDatabaseUrl === undefined) {
      setProcessEnv('DATABASE_URL');
    } else {
      setProcessEnv('DATABASE_URL', originalDatabaseUrl);
    }
  });

  it('requires production secrets and db url', () => {
    setProcessEnv('NODE_ENV', 'production');

    expect(() => validateProductionEnvironment()).toThrow(/Missing required production environment variables/i);
  });

  it('rejects weak production secrets', () => {
    setProcessEnv('NODE_ENV', 'production');
    setProcessEnv('DATABASE_URL', 'postgresql://localhost:5432/halandpet');
    setProcessEnv('SESSION_SECRET', 'short');
    setProcessEnv('NEXTAUTH_SECRET', 'short');

    expect(() => validateProductionEnvironment()).toThrow(/at least 32 characters/i);
  });

  it('allows non-production without secrets', () => {
    setProcessEnv('NODE_ENV', 'development');

    expect(() => validateProductionEnvironment()).not.toThrow();
  });
});

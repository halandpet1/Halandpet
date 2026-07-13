export function validateProductionEnvironment() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const databaseConfig = process.env.DATABASE_POOL_URL?.trim() || process.env.DATABASE_URL?.trim();
  const requiredKeys = ['SESSION_SECRET'];
  const missing = requiredKeys.filter((key) => !process.env[key]?.trim());

  if (!databaseConfig) {
    missing.push('DATABASE_URL or DATABASE_POOL_URL');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }

  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters in production');
  }
}

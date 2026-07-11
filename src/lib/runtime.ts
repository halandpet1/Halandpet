export function validateProductionEnvironment() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const requiredKeys = ['DATABASE_URL', 'SESSION_SECRET', 'NEXTAUTH_SECRET'];
  const missing = requiredKeys.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }

  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters in production');
  }

  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    throw new Error('NEXTAUTH_SECRET must be at least 32 characters in production');
  }
}

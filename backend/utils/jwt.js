/**
 * Centralised JWT_SECRET accessor.
 * Throws at startup if JWT_SECRET is not set in production.
 */
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is not set');
  }
  console.warn('[WARN] JWT_SECRET not set — using insecure fallback. Set it in .env before deploying.');
}

module.exports = JWT_SECRET || 'kentaz-super-secret-jwt';

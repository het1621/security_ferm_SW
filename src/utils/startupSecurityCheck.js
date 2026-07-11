const logger = require('./logger.js');
/**
 * src/utils/startupSecurityCheck.js
 * Phase 4.1 — Environment & Secrets Audit
 * Runs at server startup and warns about misconfigured or placeholder secrets.
 */

const PLACEHOLDER_PATTERNS = [
  /your_.*password/i,
  /your_.*key/i,
  /your_.*email/i,
  /change_me/i,
  /secret_key/i,
  /placeholder/i,
];

function isPlaceholder(value) {
  if (!value) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function runStartupSecurityCheck() {
  const warnings = [];
  const errors = [];

  // ── JWT_SECRET ────────────────────────────────────────────────────────────
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET is not set — authentication will fail');
  } else if (isPlaceholder(jwtSecret)) {
    errors.push('JWT_SECRET looks like a placeholder — set a strong random secret (32+ characters)');
  } else if (jwtSecret.length < 32) {
    errors.push(`JWT_SECRET is too short (${jwtSecret.length} chars) — minimum 32 characters required`);
  }

  // ── NODE_ENV ──────────────────────────────────────────────────────────────
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv) {
    warnings.push('NODE_ENV is not set — defaulting to development mode');
  } else if (nodeEnv !== 'production' && nodeEnv !== 'development' && nodeEnv !== 'test') {
    warnings.push(`NODE_ENV has unexpected value: "${nodeEnv}"`);
  }

  // ── SMTP credentials ──────────────────────────────────────────────────────
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  if (smtpUser && isPlaceholder(smtpUser)) {
    warnings.push('SMTP_USER appears to be a placeholder — email sending will fail');
  }
  if (smtpPass && isPlaceholder(smtpPass)) {
    warnings.push('SMTP_PASSWORD appears to be a placeholder — email sending will fail');
  }

  // ── Database ──────────────────────────────────────────────────────────────
  if (!process.env.DB_PASSWORD) {
    warnings.push('DB_PASSWORD is empty — ensure the database is properly secured');
  }

  // ── BCRYPT_ROUNDS ─────────────────────────────────────────────────────────
  const rounds = parseInt(process.env.BCRYPT_ROUNDS);
  if (rounds && rounds < 10) {
    warnings.push(`BCRYPT_ROUNDS=${rounds} is low — use 12 or higher for production`);
  }

  // ── Output ────────────────────────────────────────────────────────────────
  const isProduction = nodeEnv === 'production';

  if (errors.length > 0) {
    logger.error('\n🔴 SECURITY ERRORS — Fix these before go-live:');
    errors.forEach((e) => logger.error(`   ✗ ${e}`));
    if (isProduction) {
      // In production (Electron), log the error but do NOT kill the process.
      // Killing the process would silently close the app with no explanation to the user.
      logger.error('\n⚠ Security errors detected in production — please review configuration.\n');
    }
  }

  if (warnings.length > 0) {
    logger.warn('\n🟡 SECURITY WARNINGS:');
    warnings.forEach((w) => logger.warn(`   ⚠  ${w}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    logger.info('✅ Security check passed — all secrets look properly configured');
  }

  logger.info(''); // spacer
}

module.exports = { runStartupSecurityCheck };

/**
 * src/utils/secureLogger.js
 * Phase 4.5 — Custom Morgan logger that strips sensitive fields from logs.
 * Sensitive fields: password, password_hash, aadhar_number, pan_number,
 *                   bank_account_number, token, jwt, otp
 */

const morgan = require('morgan');

// Fields that must NEVER appear in any log output
const SENSITIVE_FIELDS = new Set([
  'password',
  'password_hash',
  'new_password',
  'confirm_password',
  'current_password',
  'aadhar_number',
  'pan_number',
  'bank_account_number',
  'bank_ifsc_code',
  'token',
  'jwt',
  'otp',
  'reset_token',
  'smtp_pass',
  'secret',
]);

/**
 * Recursively redact sensitive keys from any object.
 * Returns a NEW object — does not mutate the original.
 */
function redactSensitive(obj, depth = 0) {
  if (depth > 5 || !obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => redactSensitive(item, depth + 1));

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redactSensitive(value, depth + 1);
    }
  }
  return result;
}

// Register a custom token: sanitised request body (max 300 chars)
morgan.token('safe-body', (req) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) return '-';
    const sanitised = redactSensitive(req.body);
    const json = JSON.stringify(sanitised);
    return json.length > 300 ? json.substring(0, 297) + '...' : json;
  } catch {
    return '-';
  }
});

// Register a custom token: user info (id + role, never the JWT itself)
morgan.token('user-info', (req) => {
  if (!req.user) return 'anonymous';
  return `uid=${req.user.userId || '?'} role=${req.user.role || '?'}`;
});

/**
 * Secure development format — shows method, URL, status, response-time, user, and sanitised body.
 */
const secureDev = morgan(
  ':method :url :status :response-time ms | :user-info | body::safe-body'
);

/**
 * Secure production format — compact, no body logged.
 */
const secureProd = morgan(
  ':remote-addr - :user-info ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms'
);

/**
 * Returns the appropriate logger middleware based on NODE_ENV.
 */
function createLogger() {
  return process.env.NODE_ENV === 'production' ? secureProd : secureDev;
}

module.exports = { createLogger, redactSensitive };

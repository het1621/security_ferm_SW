const logger = require('./logger.js');
const { query } = require('../database/connection');

/**
 * Enhanced Error Logger - Centralized error tracking
 * Captures all errors with severity levels, categorization, and context
 */

const ERROR_SEVERITY = {
  CRITICAL: 'critical',    // System down, data loss risk
  HIGH: 'high',            // Feature broken, significant impact
  MEDIUM: 'medium',        // Feature degraded, workaround exists
  LOW: 'low',              // Minor issue, doesn't affect functionality
  INFO: 'info'             // Informational, not really an error
};

const ERROR_CATEGORY = {
  // Database
  DATABASE: 'database',
  QUERY_ERROR: 'query_error',
  MIGRATION: 'migration',
  CONNECTION: 'connection',
  
  // Authentication & Security
  AUTH: 'auth',
  PERMISSION: 'permission',
  VALIDATION: 'validation',
  SECURITY: 'security',
  
  // Business Logic
  PAYROLL: 'payroll',
  INVOICING: 'invoicing',
  GST: 'gst',
  TAX: 'tax',
  REPORTING: 'reporting',
  
  // Integration
  PAYMENT: 'payment',
  EMAIL: 'email',
  PDF: 'pdf',
  BACKUP: 'backup',
  
  // Frontend
  FRONTEND: 'frontend',
  API_CALL: 'api_call',
  
  // System
  FILE_SYSTEM: 'file_system',
  EXTERNAL_API: 'external_api',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown'
};

async function logError({
  error,
  req,
  severity = ERROR_SEVERITY.MEDIUM,
  category = ERROR_CATEGORY.UNKNOWN,
  feature,
  endpoint,
  method,
  extra = {}
} = {}) {
  try {
    // Extract request info
    const user_id = req?.user?.userId || null;
    const client_ip = req?.ip || req?.connection?.remoteAddress || 'unknown';
    const final_endpoint = endpoint || req?.originalUrl || req?.url || null;
    const final_method = method || req?.method || 'UNKNOWN';

    // Build error message
    const error_type = category;
    const error_message = error?.message || (typeof error === 'string' ? error : 'Unknown error');
    const stack_trace = error?.stack || null;

    // Build additional context
    const additional_data = {
      feature: feature || null,
      severity: severity,
      params: req?.params || null,
      query_params: req?.query || null,
      body: req?.body ? sanitizeBody(req.body) : null,
      error_type: error?.name || 'Error',
      ...extra
    };

    // Insert into database
    const sql = `
      INSERT INTO error_logs (
        error_type, 
        error_message, 
        stack_trace, 
        endpoint, 
        method, 
        user_id, 
        client_ip, 
        additional_data,
        severity,
        feature,
        is_resolved,
        resolved_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, NULL)
    `;

    await query(sql, [
      error_type,
      error_message,
      stack_trace,
      final_endpoint,
      final_method,
      user_id,
      client_ip,
      JSON.stringify(additional_data),
      severity,
      feature
    ]);

    // Log to file as well
    logger.error(`[${severity.toUpperCase()}] [${category}] ${error_message}`, {
      endpoint: final_endpoint,
      method: final_method,
      user_id,
      stack_trace
    });

    // Notify admin if critical
    if (severity === ERROR_SEVERITY.CRITICAL) {
      await notifyAdminOfCriticalError({
        error_message,
        category,
        user_id,
        endpoint: final_endpoint
      });
    }

  } catch (dbErr) {
    logger.error('[EnhancedErrorLogger] Failed to log error:', dbErr.message);
    logger.error('[EnhancedErrorLogger] Original error was:', error?.message || error);
  }
}

function sanitizeBody(body) {
  // Remove sensitive data from logs
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'pin', 'token', 'secret', 'aadhar', 'pan', 'bankAccount'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  return sanitized;
}

async function notifyAdminOfCriticalError(errorInfo) {
  try {
    // TODO: Implement notification to admin users
    // Could be email, Slack, or push notification
    logger.warn('[CriticalError] Admin notification triggered:', errorInfo);
  } catch (err) {
    logger.error('[NotifyAdmin] Failed:', err.message);
  }
}

module.exports = {
  logError,
  ERROR_SEVERITY,
  ERROR_CATEGORY
};

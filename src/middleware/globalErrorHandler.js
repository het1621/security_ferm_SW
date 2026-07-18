const { logError, ERROR_SEVERITY, ERROR_CATEGORY } = require('../utils/enhancedErrorLogger');

/**
 * Global error handler middleware
 * Catches ANY error thrown in route handlers and logs it
 */
function globalErrorHandler(err, req, res, next) {
  console.error('Global Error Handler:', err);

  // Determine severity based on error type
  let severity = ERROR_SEVERITY.HIGH;
  let category = ERROR_CATEGORY.UNKNOWN;

  if (err.message.includes('database') || err.message.includes('query')) {
    category = ERROR_CATEGORY.DATABASE;
    severity = ERROR_SEVERITY.CRITICAL;
  } else if (err.message.includes('auth')) {
    category = ERROR_CATEGORY.AUTH;
    severity = ERROR_SEVERITY.MEDIUM;
  } else if (err.message.includes('validation')) {
    category = ERROR_CATEGORY.VALIDATION;
    severity = ERROR_SEVERITY.LOW;
  }

  // Log the error
  logError({
    error: err,
    req,
    severity,
    category,
    feature: req.route?.path || 'unknown',
    extra: {
      handler: 'globalErrorHandler',
      statusCode: err.statusCode || 500
    }
  });

  // Return error response
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'An error occurred' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { error: err.message })
  });
}

module.exports = globalErrorHandler;

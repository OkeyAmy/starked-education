/**
 * Centralized Error Handling Middleware
 * Catches all thrown errors and returns consistent JSON responses
 */

const { AppError } = require('../utils/errors');

/**
 * Async handler wrapper to catch async errors in Express 4
 * Wraps async route handlers and forwards errors to next()
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Centralized error handling middleware
 * Must be mounted last, after all routes
 */
const errorHandler = (err, req, res, next) => {
  // Default to 500 Internal Server Error
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'Internal server error';
  let details = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof Error) {
    message = err.message || message;
    // Try to extract statusCode from generic errors
    if (err.statusCode && typeof err.statusCode === 'number') {
      statusCode = err.statusCode;
    } else if (err.status && typeof err.status === 'number') {
      statusCode = err.status;
    }
    if (err.errorCode) {
      errorCode = err.errorCode;
    }
  }

  const isDevelopment = process.env.NODE_ENV === 'development';

  const errorResponse = {
    error: {
      code: errorCode,
      message,
      ...(details && { details }),
      ...(isDevelopment && err.stack ? { stack: err.stack } : {}),
    },
    // Legacy compatibility - helps existing tests/clients migrate
    success: false,
    message,
  };

  // Log error
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} -> ${statusCode} ${errorCode}: ${message}`);
  if (isDevelopment && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 * Should be mounted after all routes, before errorHandler
 */
const notFoundHandler = (req, res, next) => {
  const { NotFoundError } = require('../utils/errors');
  next(new NotFoundError(`Endpoint not found: ${req.method} ${req.originalUrl}`));
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
};

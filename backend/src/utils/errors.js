/**
 * AppError class hierarchy
 * Provides standardized error handling with HTTP status codes and error codes
 */

class AppError extends Error {
  constructor(
    message,
    statusCode = 500,
    errorCode = 'INTERNAL_SERVER_ERROR',
    details
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      code: this.errorCode,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * 400 Bad Request - Validation errors
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed', details) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * 401 Unauthorized - Authentication errors
 */
class AuthError extends AppError {
  constructor(message = 'Authentication required', details) {
    super(message, 401, 'AUTH_ERROR', details);
  }
}

/**
 * 403 Forbidden - Authorization errors
 */
class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', details) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

/**
 * 404 Not Found
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

/**
 * 409 Conflict
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * 402 / 400 Payment errors
 */
class PaymentError extends AppError {
  constructor(message = 'Payment processing failed', details) {
    super(message, 402, 'PAYMENT_ERROR', details);
  }
}

/**
 * 429 Too Many Requests
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests', details) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
  }
}

/**
 * 500 Internal Server Error
 */
class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details);
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  PaymentError,
  RateLimitError,
  InternalServerError,
};

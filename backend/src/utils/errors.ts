/**
 * AppError class hierarchy
 * Provides standardized error handling with HTTP status codes and error codes
 */

export interface ErrorDetails {
  [key: string]: any;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: ErrorDetails;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_SERVER_ERROR',
    details?: ErrorDetails
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;

    // Maintain proper stack trace (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    Object.setPrototypeOf(this, new.target.prototype);
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
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: ErrorDetails) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * 401 Unauthorized - Authentication errors
 */
export class AuthError extends AppError {
  constructor(message: string = 'Authentication required', details?: ErrorDetails) {
    super(message, 401, 'AUTH_ERROR', details);
  }
}

/**
 * 403 Forbidden - Authorization errors
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden', details?: ErrorDetails) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: ErrorDetails) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

/**
 * 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: ErrorDetails) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * 402 / 400 Payment errors
 */
export class PaymentError extends AppError {
  constructor(message: string = 'Payment processing failed', details?: ErrorDetails) {
    super(message, 402, 'PAYMENT_ERROR', details);
  }
}

/**
 * 429 Too Many Requests
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', details?: ErrorDetails) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: ErrorDetails) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details);
  }
}

export default AppError;

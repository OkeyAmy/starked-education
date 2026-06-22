/**
 * Centralized Error Handling Middleware
 * Catches all thrown errors and returns consistent JSON responses
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
  // Legacy compatibility fields
  success?: boolean;
  message?: string;
}

/**
 * Async handler wrapper to catch async errors in Express 4
 * Wraps async route handlers and forwards errors to next()
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Centralized error handling middleware
 * Must be mounted last, after all routes
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default to 500 Internal Server Error
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'Internal server error';
  let details: any = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof Error) {
    message = err.message || message;
    // Try to extract statusCode from generic errors
    const maybeErr = err as any;
    if (maybeErr.statusCode && typeof maybeErr.statusCode === 'number') {
      statusCode = maybeErr.statusCode;
    } else if (maybeErr.status && typeof maybeErr.status === 'number') {
      statusCode = maybeErr.status;
    }
    if (maybeErr.errorCode) {
      errorCode = maybeErr.errorCode;
    }
  }

  const isDevelopment = process.env.NODE_ENV === 'development';

  const errorResponse: ErrorResponse = {
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
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const { NotFoundError } = require('../utils/errors');
  next(new NotFoundError(`Endpoint not found: ${req.method} ${req.originalUrl}`));
};

// CommonJS compatibility for JS routes
module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
};

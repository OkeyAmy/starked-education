/**
 * validateRequestSchema — Lightweight Joi-based validation middleware factory
 *
 * Extracted from middleware/validation.ts to break a babel-jest CommonJS
 * evaluation-order crash.  Because this module has zero heavy dependencies
 * (no Joi import, no express-validator, no VersionControlUtils), it can
 * be required safely by route files that call the factory at module-load
 * time (e.g. smartWallet.ts:24).
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Minimal structural interface for a Joi-like schema object.
 * We deliberately avoid importing Joi so this module stays lean
 * and does not trigger the babel-jest circular-eval bug.
 */
export interface SchemaLike {
  validate(value: unknown): { error?: { details: Array<{ message: string }> } };
}

export interface ValidationSchema {
  body?: SchemaLike;
  query?: SchemaLike;
  params?: SchemaLike;
}

/**
 * Factory that returns Express middleware which validates
 * req.body, req.query, and/or req.params against Joi schemas.
 */
export function validateRequestSchema(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Validate request body
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(`Body: ${error.details[0].message}`);
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(`Query: ${error.details[0].message}`);
      }
    }

    // Validate route parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(`Params: ${error.details[0].message}`);
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
      return;
    }

    next();
  };
}

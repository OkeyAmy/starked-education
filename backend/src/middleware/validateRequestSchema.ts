/**
 * validateRequestSchema — Lightweight Joi-based validation middleware factory.
 *
 * This module is intentionally dependency-free (no `joi`, no
 * `express-validator`, no `VersionControlUtils`) so it can be `require`d
 * by route files that call the factory at module-load time without
 * crashing under babel-jest's CommonJS evaluation order (the root cause
 * of Issue #44).  Routes pass in any Joi schema object with a
 * `validate(value)` method; we treat it as a duck-typed `SchemaLike`.
 *
 * Behaviour:
 *   * Validates `req.body`, `req.query`, and `req.params` against the
 *     provided Joi schemas, aggregating every error (not just the first)
 *     with field/message context.
 *   * On failure, responds with the standard envelope used elsewhere in
 *     the codebase:
 *         { success: false, message: 'Validation failed', errors: [...] }
 *   * On success, replaces each source with the validated (and unknown-
 *     stripped) value before calling `next()`.
 */

import { Request, Response, NextFunction } from 'express';

/** Minimal structural interface for a Joi-like schema object. */
type Detail = { path: Array<string | number>; message: string; type?: string };

/** Minimal structural interface for a Joi-like schema object. */
export interface SchemaLike {
  validate(
    value: unknown,
    options?: { stripUnknown?: boolean; abortEarly?: boolean }
  ): {
    error?: { details: Detail[] };
    value?: unknown;
  };
}

export interface ValidationSchema {
  body?: SchemaLike;
  query?: SchemaLike;
  params?: SchemaLike;
}

interface NormalizedError {
  source: 'body' | 'query' | 'params';
  field: string;
  message: string;
}

const VALIDATE_OPTIONS = {
  abortEarly: false,
  stripUnknown: true,
} as const;

function safePath(path: Detail['path'] | undefined | null): string {
  if (!path || !Array.isArray(path) || path.length === 0) {
    return '(root)';
  }
  return path.join('.');
}

function collect(source: 'body' | 'query' | 'params', schema: SchemaLike, payload: unknown): {
  errors: NormalizedError[];
  value: unknown;
} {
  const result = schema.validate(payload, VALIDATE_OPTIONS);
  if (!result.error) {
    return { errors: [], value: result.value ?? payload };
  }
  const errors: NormalizedError[] = result.error.details.map((detail) => ({
    source,
    field: safePath(detail.path),
    message: detail.message,
  }));
  return { errors, value: result.value ?? payload };
}

/**
 * Factory that returns Express middleware which validates req.body,
 * req.query, and/or req.params against Joi schemas.
 */
export function validateRequestSchema(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const sources: Array<'body' | 'query' | 'params'> = ['body', 'query', 'params'];
    const errors: NormalizedError[] = [];

    for (const source of sources) {
      const sub = schema[source];
      if (!sub) continue;
      const outcome = collect(source, sub, req[source]);
      if (outcome.errors.length) {
        errors.push(...outcome.errors);
      }
      // Replace the request source with the validated/sanitized value.
      // Request.body, Request.query, Request.params are all `any` on
      // Express's Request, so we use an explicit switch rather than
      // a `Record<string, unknown>` cast (which trips TS2352).
      // Replace the request source with the validated/sanitized value.
      // Express types `req.query` as `ParsedQs` and `req.params` as
      // `ParamsDictionary` (both stricter than `unknown`), so we widen
      // locally — the value has already been validated/stripped by Joi
      // in collect() above.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      req.query = (source === 'query' ? outcome.value : req.query) as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      req.params = (source === 'params' ? outcome.value : req.params) as any;
      req.body = source === 'body' ? outcome.value : req.body;
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    next();
  };
}

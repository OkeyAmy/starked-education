/**
 * @deprecated This file was a temporary no-op workaround for Issue #44
 * (babel-jest CommonJS evaluation-order crash with validateRequestSchema).
 * The root cause has been fixed by extracting validateRequestSchema into
 * a standalone lightweight module at middleware/validateRequestSchema.ts.
 *
 * This stub no longer serves a purpose and will be removed in a future cleanup.
 * Do NOT import validation middleware from this file – use middleware/validation
 * or middleware/validateRequestSchema instead.
 */

export const validateAssignment = (req: any, res: any, next: any) => next();
export const validateSubmission = (req: any, res: any, next: any) => next();
export const validateRequest = (req: any, res: any, next: any) => next();

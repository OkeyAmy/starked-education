/**
 * @deprecated This file was a temporary no-op workaround for Issue #44
 * (babel-jest CommonJS evaluation-order crash with validateRequestSchema).
 * The root cause has been fixed by extracting validateRequestSchema into
 * a standalone lightweight module at middleware/validateRequestSchema.ts.
 *
 * NOTE: `validateAssignment` is still referenced by
 * `controllers/assignmentController.ts` (as an internal helper returning
 * `{ isValid, error }`), and `validateSubmission` is imported-but-unused.
 * They are intentionally left in place to keep the cleanup scope of the
 * Issue #44 PR minimal; they should be removed (or migrated to real Joi
 * schemas from `middleware/validation.ts`) in a follow-up dedicated PR
 * that targets the assignment domain.
 *
 * Do NOT import validation middleware from this file for new code – use
 * `middleware/validation` or `middleware/validateRequestSchema` instead.
 */

export const validateAssignment = (data: any) => ({ isValid: true, error: null });
export const validateSubmission = (req: any, _res: any, next: any) => next();
export const validateRequest = (req: any, _res: any, next: any) => next();

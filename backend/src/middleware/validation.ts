/**
 * Validation Middleware
 * Validation functions for content versions and related operations
 */

import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { VersionControlUtils } from '../models/ContentVersion';
import Joi from 'joi';

/**
 * Handle validation errors middleware
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

/**
 * Generic validation middleware
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined
    }));

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
    return;
  }

  next();
};

/**
 * Validate content version creation request
 */
export const validateContentVersionCreation = [
  body('contentId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Content ID is required'),
  
  body('title')
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  
  body('description')
    .isString()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('content')
    .notEmpty()
    .withMessage('Content is required')
    .isObject()
    .withMessage('Content must be an object'),
  
  body('changes')
    .isArray({ min: 1 })
    .withMessage('Changes array must contain at least one item'),
  
  body('changes.*')
    .isString()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Each change description must be between 5 and 500 characters'),
  
  body('createdBy')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Creator ID is required'),
  
  handleValidationErrors
];

/**
 * Validate content version update request
 */
export const validateContentVersionUpdate = [
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('content')
    .optional()
    .notEmpty()
    .withMessage('Content cannot be empty if provided')
    .isObject()
    .withMessage('Content must be an object'),
  
  body('changes')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Changes array must contain at least one item if provided'),
  
  body('changes.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Each change description must be between 5 and 500 characters'),
  
  handleValidationErrors
];

/**
 * Validate version restore request
 */
export const validateVersionRestore = [
  body('contentId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Content ID is required'),
  
  body('versionId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Version ID is required'),
  
  body('restoreReason')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Restore reason must be between 5 and 500 characters'),
  
  body('restoredBy')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Restored by user ID is required'),
  
  handleValidationErrors
];

/**
 * Validate version comparison request
 */
export const validateVersionComparison = [
  param('version1Id')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('First version ID is required'),
  
  param('version2Id')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Second version ID is required'),
  
  handleValidationErrors
];

/**
 * Validate version history query parameters
 */
export const validateVersionHistoryQuery = [
  param('contentId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Content ID is required'),
  
  query('createdBy')
    .optional()
    .isString()
    .trim()
    .withMessage('Created by must be a string'),
  
  query('isCurrent')
    .optional()
    .isBoolean()
    .withMessage('Is current must be a boolean'),
  
  query('versionMin')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum version must be a positive integer'),
  
  query('versionMax')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Maximum version must be a positive integer'),
  
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Date from must be a valid ISO 8601 date'),
  
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Date to must be a valid ISO 8601 date'),
  
  query('sortBy')
    .optional()
    .isIn(['version', 'createdAt', 'title'])
    .withMessage('Sort by must be one of: version, createdAt, title'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

/**
 * Validate version control settings update
 */
export const validateVersionControlSettings = [
  body('autoVersioning')
    .optional()
    .isBoolean()
    .withMessage('Auto versioning must be a boolean'),
  
  body('maxVersions')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Max versions must be a non-negative integer (0 for unlimited)'),
  
  handleValidationErrors
];

/**
 * Validate version export request
 */
export const validateVersionExport = [
  param('contentId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Content ID is required'),
  
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Format must be either json or csv'),
  
  handleValidationErrors
];

/**
 * Custom validation middleware for content version data
 */
export const validateVersionData = (req: Request, res: Response, next: NextFunction) => {
  try {
    const versionData = req.body;
    const validation = VersionControlUtils.validateVersion(versionData);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Version data validation failed',
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }
    
    // Attach warnings to request for potential use in controllers
    req.versionWarnings = validation.warnings;
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Version validation error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Validate content ID parameter
 */
export const validateContentIdParam = [
  param('contentId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Content ID is required'),
  
  handleValidationErrors
];

/**
 * Validate version ID parameter
 */
export const validateVersionIdParam = [
  param('versionId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Version ID is required'),
  
  handleValidationErrors
];

/**
 * Validate version number parameter
 */
export const validateVersionNumberParam = [
  param('versionNumber')
    .isInt({ min: 1 })
    .withMessage('Version number must be a positive integer'),
  
  handleValidationErrors
];

/**
 * Middleware to check if user has permission to manage versions
 */
export const checkVersionManagementPermission = (req: Request, res: Response, next: NextFunction) => {
  // This would typically check user permissions
  // For now, we'll assume the user has permission if they're authenticated
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required for version management',
    });
  }
  
  // In a real implementation, you would check specific permissions
  // For example: if (!req.user.permissions.includes('manage_versions')) { ... }
  
  next();
};

/**
 * Middleware to check if user can restore versions (typically course creators/admins)
 */
export const checkVersionRestorePermission = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required for version restoration',
    });
  }
  
  // In a real implementation, check if user is course creator or admin
  // For example: check if user owns the content or has admin privileges
  
  next();
};

/**
 * Middleware to validate date range for version history filtering
 */
export const validateDateRange = (req: Request, res: Response, next: NextFunction) => {
  const { dateFrom, dateTo } = req.query;
  
  if (dateFrom && dateTo) {
    const from = new Date(dateFrom as string);
    const to = new Date(dateTo as string);
    
    if (from >= to) {
      return res.status(400).json({
        success: false,
        message: 'Date from must be before date to',
      });
    }
  }
  
  next();
};

// Extend Express Request interface to include custom properties
declare global {
  namespace Express {
    interface Request {
      versionWarnings?: Array<{
        field: string;
        message: string;
        value?: any;
      }>;
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
    }
  }
}

// Re-export validateRequestSchema and ValidationSchema from the lightweight
// standalone module to avoid babel-jest CommonJS evaluation-order crashes
// when route files (e.g. smartWallet.ts) call the factory at module-load time.
import { validateRequestSchema } from './validateRequestSchema';
import type { ValidationSchema } from './validateRequestSchema';
export { validateRequestSchema };
export type { ValidationSchema };

// Assignment validation schemas
export const createAssignmentSchema: ValidationSchema = {
  body: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    instructions: Joi.string().min(10).max(5000).required(),
    type: Joi.string().valid('quiz', 'essay', 'code', 'project', 'video', 'file_upload', 'text_submission').required(),
    submissionTypes: Joi.array().items(Joi.string().valid('text', 'file', 'code', 'video', 'audio', 'multiple_files')).min(1).required(),
    maxPoints: Joi.number().min(1).max(1000).required(),
    dueDate: Joi.date().iso().required(),
    allowLateSubmissions: Joi.boolean().default(false),
    latePolicy: Joi.string().valid('no_late_submissions', 'penalty_per_hour', 'penalty_per_day', 'no_penalty').optional(),
    latePenaltyAmount: Joi.number().min(0).max(100).optional(),
    maxAttempts: Joi.number().min(1).max(10).optional(),
    timeLimit: Joi.number().min(1).max(480).optional(),
    allowedFileTypes: Joi.array().items(Joi.string()).optional(),
    maxFileSize: Joi.number().min(1).max(500).optional(),
    maxFiles: Joi.number().min(1).max(50).optional(),
    isPublished: Joi.boolean().default(false),
    showSolutions: Joi.date().iso().optional(),
    autoGrade: Joi.boolean().default(false),
    plagiarismCheck: Joi.boolean().default(true),
    groupAssignment: Joi.boolean().default(false),
    maxGroupSize: Joi.number().min(2).max(10).optional(),
    resources: Joi.array().items(Joi.object({
      title: Joi.string().required(),
      description: Joi.string().optional(),
      type: Joi.string().valid('file', 'link', 'video', 'text').required(),
      url: Joi.string().uri().optional(),
      content: Joi.string().optional(),
      fileName: Joi.string().optional(),
      fileSize: Joi.number().optional(),
      mimeType: Joi.string().optional()
    })).default([])
  }),
  params: Joi.object({
    courseId: Joi.string().uuid().required()
  })
};

export const updateAssignmentSchema: ValidationSchema = {
  body: Joi.object({
    title: Joi.string().min(3).max(200).optional(),
    description: Joi.string().min(10).max(2000).optional(),
    instructions: Joi.string().min(10).max(5000).optional(),
    dueDate: Joi.date().iso().optional(),
    allowLateSubmissions: Joi.boolean().optional(),
    latePolicy: Joi.string().valid('no_late_submissions', 'penalty_per_hour', 'penalty_per_day', 'no_penalty').optional(),
    latePenaltyAmount: Joi.number().min(0).max(100).optional(),
    maxAttempts: Joi.number().min(1).max(10).optional(),
    timeLimit: Joi.number().min(1).max(480).optional(),
    allowedFileTypes: Joi.array().items(Joi.string()).optional(),
    maxFileSize: Joi.number().min(1).max(500).optional(),
    maxFiles: Joi.number().min(1).max(50).optional(),
    isPublished: Joi.boolean().optional(),
    showSolutions: Joi.date().iso().optional(),
    autoGrade: Joi.boolean().optional(),
    plagiarismCheck: Joi.boolean().optional(),
    groupAssignment: Joi.boolean().optional(),
    maxGroupSize: Joi.number().min(2).max(10).optional(),
    resources: Joi.array().items(Joi.object({
      title: Joi.string().required(),
      description: Joi.string().optional(),
      type: Joi.string().valid('file', 'link', 'video', 'text').required(),
      url: Joi.string().uri().optional(),
      content: Joi.string().optional(),
      fileName: Joi.string().optional(),
      fileSize: Joi.number().optional(),
      mimeType: Joi.string().optional()
    })).optional()
  }),
  params: Joi.object({
    assignmentId: Joi.string().uuid().required()
  })
};

export const createSubmissionSchema: ValidationSchema = {
  body: Joi.object({
    textContent: Joi.string().max(10000).optional(),
    codeSubmission: Joi.object({
      language: Joi.string().required(),
      code: Joi.string().required(),
      fileName: Joi.string().optional()
    }).optional(),
    videoSubmission: Joi.object({
      url: Joi.string().uri().required(),
      duration: Joi.number().min(1).required(),
      thumbnail: Joi.string().uri().optional(),
      fileSize: Joi.number().required(),
      format: Joi.string().required()
    }).optional(),
    audioSubmission: Joi.object({
      url: Joi.string().uri().required(),
      duration: Joi.number().min(1).required(),
      fileSize: Joi.number().required(),
      format: Joi.string().required(),
      transcription: Joi.string().optional()
    }).optional()
  }),
  params: Joi.object({
    assignmentId: Joi.string().uuid().required()
  })
};

export const gradeSubmissionSchema: ValidationSchema = {
  body: Joi.object({
    totalPoints: Joi.number().min(0).required(),
    earnedPoints: Joi.number().min(0).required(),
    feedback: Joi.string().max(5000).optional(),
    privateFeedback: Joi.string().max(5000).optional(),
    rubricGrades: Joi.array().items(Joi.object({
      criterionId: Joi.string().uuid().required(),
      levelId: Joi.string().uuid().required(),
      points: Joi.number().min(0).required(),
      feedback: Joi.string().max(1000).optional()
    })).optional(),
    annotations: Joi.array().items(Joi.object({
      type: Joi.string().valid('text', 'drawing', 'highlight', 'comment').required(),
      content: Joi.string().required(),
      position: Joi.object({
        x: Joi.number().required(),
        y: Joi.number().required(),
        page: Joi.number().optional(),
        selection: Joi.object({
          start: Joi.number().required(),
          end: Joi.number().required()
        }).optional()
      }).required()
    })).optional()
  }),
  params: Joi.object({
    submissionId: Joi.string().uuid().required()
  })
};

export const bulkGradeSchema: ValidationSchema = {
  body: Joi.object({
    operation: Joi.string().valid('apply_rubric', 'apply_late_penalty', 'bulk_feedback', 'auto_grade').required(),
    criteria: Joi.object().optional(),
    gradingData: Joi.object().optional()
  }),
  params: Joi.object({
    assignmentId: Joi.string().uuid().required()
  })
};

// Stub validation exports for enrollment/payment routes
export const validateEnrollment = (req: Request, res: Response, next: NextFunction) => next();
export const validateEnrollmentUpdate = (req: Request, res: Response, next: NextFunction) => next();
export const validatePayment = (req: Request, res: Response, next: NextFunction) => next();

// Federated Learning Validation Schemas

const MODEL_HASH_REGEX = /^[a-f0-9]{64}$/i; // SHA-256 hex
const MAX_MODEL_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const differentialPrivacySchema = Joi.object({
  epsilon: Joi.number().positive().max(10).optional(),
  delta: Joi.number().positive().max(1).optional(),
  mechanism: Joi.string().valid('laplace', 'gaussian').optional(),
});

export const initializeSessionSchema: ValidationSchema = {
  body: Joi.object({
    modelType: Joi.string().min(1).max(100).required()
      .messages({ 'any.required': '"modelType" is required', 'string.empty': '"modelType" cannot be empty' }),
    minParticipants: Joi.number().integer().min(1).max(10000).required()
      .messages({ 'any.required': '"minParticipants" is required', 'number.base': '"minParticipants" must be a number' }),
    rounds: Joi.number().integer().min(1).max(10000).required()
      .messages({ 'any.required': '"rounds" is required' }),
    aggregationStrategy: Joi.string().valid('fedAvg', 'fedProx', 'scaffold', 'mime').required()
      .messages({ 'any.required': '"aggregationStrategy" is required', 'any.only': '"aggregationStrategy" must be one of: fedAvg, fedProx, scaffold, mime' }),
    modelArchitecture: Joi.object().optional(),
    initialWeights: Joi.any().optional(),
  }),
};

export const registerParticipantSchema: ValidationSchema = {
  body: Joi.object({
    sessionId: Joi.string().min(1).max(255).required()
      .messages({ 'any.required': '"sessionId" is required' }),
    publicKey: Joi.string().min(1).max(1024).required()
      .messages({ 'any.required': '"publicKey" is required', 'string.empty': '"publicKey" cannot be empty' }),
    institutionId: Joi.string().min(1).max(255).required()
      .messages({ 'any.required': '"institutionId" is required' }),
    endpoint: Joi.string().uri().required()
      .messages({ 'any.required': '"endpoint" is required', 'string.uri': '"endpoint" must be a valid URI' }),
    capabilities: Joi.object().optional(),
    dataInfo: Joi.object().optional(),
  }),
};

export const submitModelUpdateSchema: ValidationSchema = {
  body: Joi.object({
    roundNumber: Joi.number().integer().min(0).required()
      .messages({ 'any.required': '"roundNumber" is required', 'number.min': '"roundNumber" must be >= 0' }),
    modelHash: Joi.string().pattern(MODEL_HASH_REGEX).required()
      .messages({ 'any.required': '"modelHash" is required', 'string.pattern.base': '"modelHash" must be a valid SHA-256 hex string' }),
    gradientShape: Joi.array().items(Joi.number().integer().positive()).min(1).required()
      .messages({ 'any.required': '"gradientShape" is required', 'array.min': '"gradientShape" must have at least one dimension' }),
    privacyParams: differentialPrivacySchema.optional(),
    weights: Joi.any().optional(),
    validationData: Joi.any().optional(),
  }).custom((value, helpers) => {
    const payloadSize = Buffer.byteLength(JSON.stringify(value), 'utf8');
    if (payloadSize > MAX_MODEL_PAYLOAD_BYTES) {
      return helpers.error('any.invalid');
    }
    return value;
  }).messages({ 'any.invalid': `Model payload exceeds maximum size of ${MAX_MODEL_PAYLOAD_BYTES / (1024 * 1024)}MB` }),
};

export const validateFederatedSession = validateRequestSchema(initializeSessionSchema);
export const validateFederatedParticipant = validateRequestSchema(registerParticipantSchema);
export const validateFederatedModelUpdate = validateRequestSchema(submitModelUpdateSchema);

// ---------------------------------------------------------------------------
// Collaboration Room Schemas
// ---------------------------------------------------------------------------

export const createRoomSchema: ValidationSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(200).required()
      .messages({ 'any.required': '"name" is required' }),
    courseId: Joi.string().trim().min(1).max(128).required()
      .messages({ 'any.required': '"courseId" is required' }),
    scheduledAt: Joi.date().iso().optional(),
    maxParticipants: Joi.number().integer().min(1).max(500).optional(),
    description: Joi.string().max(2000).optional(),
  }),
};

export const endRoomSchema: ValidationSchema = {
  params: Joi.object({
    roomId: Joi.string().trim().min(1).required()
      .messages({ 'any.required': '"roomId" param is required' }),
  }),
};

export const getRoomByIdSchema: ValidationSchema = {
  params: Joi.object({
    roomId: Joi.string().trim().min(1).required(),
  }),
};

export const listRoomsSchema: ValidationSchema = {
  query: Joi.object({
    courseId: Joi.string().trim().optional(),
    status: Joi.string().valid('active', 'ended', 'scheduled').optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
  }),
};

// ---------------------------------------------------------------------------
// Notification Schemas
// ---------------------------------------------------------------------------

export const markAsReadSchema: ValidationSchema = {
  params: Joi.object({
    notificationId: Joi.string().trim().min(1).required()
      .messages({ 'any.required': '"notificationId" param is required' }),
  }),
};

export const markAllAsReadSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required()
      .messages({ 'any.required': '"userId" is required' }),
  }),
};

export const updatePreferencesSchema: ValidationSchema = {
  params: Joi.object({
    userId: Joi.string().trim().min(1).required(),
  }),
  body: Joi.object({
    emailNotifications: Joi.boolean().optional(),
    pushNotifications: Joi.boolean().optional(),
    inAppNotifications: Joi.boolean().optional(),
    digestFrequency: Joi.string().valid('daily', 'weekly', 'never').optional(),
    quietHoursStart: Joi.string().regex(/^\d{2}:\d{2}$/).optional(),
    quietHoursEnd: Joi.string().regex(/^\d{2}:\d{2}$/).optional(),
  }).min(1).messages({ 'object.min': 'At least one preference field must be provided' }),
};

export const getNotificationsSchema: ValidationSchema = {
  params: Joi.object({
    userId: Joi.string().trim().min(1).required(),
  }),
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    unreadOnly: Joi.boolean().optional(),
    type: Joi.string().optional(),
  }),
};

export const deleteNotificationSchema: ValidationSchema = {
  params: Joi.object({
    notificationId: Joi.string().trim().min(1).required(),
  }),
};

// ---------------------------------------------------------------------------
// User Profile Schemas
// ---------------------------------------------------------------------------

export const getProfileSchema: ValidationSchema = {
  params: Joi.object({
    address: Joi.string().trim().min(1).required(),
  }),
};

export const updateProfileSchema: ValidationSchema = {
  params: Joi.object({
    address: Joi.string().trim().min(1).required(),
  }),
  body: Joi.object({
    username: Joi.string().trim().min(3).max(50).optional(),
    email: Joi.string().email().optional(),
    bio: Joi.string().max(500).optional(),
    avatar: Joi.string().uri().optional(),
    displayName: Joi.string().trim().max(100).optional(),
    timezone: Joi.string().optional(),
    language: Joi.string().length(2).optional(),
  }).min(1).messages({ 'object.min': 'At least one field must be provided for update' }),
};

export const getUserSettingsSchema: ValidationSchema = {
  params: Joi.object({
    userId: Joi.string().trim().min(1).required(),
  }),
};

export const updateUserSettingsSchema: ValidationSchema = {
  params: Joi.object({
    userId: Joi.string().trim().min(1).required(),
  }),
  body: Joi.object().min(1).messages({ 'object.min': 'Settings object must not be empty' }),
};

// ---------------------------------------------------------------------------
// AGI Tutor Schemas
// ---------------------------------------------------------------------------

export const generateSessionSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    topic: Joi.string().trim().min(1).max(500).required(),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').optional(),
    duration: Joi.number().integer().min(5).max(480).optional(),
    preferredStyle: Joi.string().valid('visual', 'auditory', 'reading', 'kinesthetic').optional(),
    prerequisites: Joi.array().items(Joi.string()).optional(),
  }),
};

export const processResponseSchema: ValidationSchema = {
  body: Joi.object({
    sessionId: Joi.string().trim().min(1).required(),
    userId: Joi.string().trim().min(1).required(),
    response: Joi.string().trim().min(1).max(10000).required(),
    context: Joi.object().optional(),
  }),
};

export const generateAssessmentSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    topic: Joi.string().trim().min(1).max(500).required(),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').required(),
    questionCount: Joi.number().integer().min(1).max(100).optional(),
    format: Joi.string().valid('multiple_choice', 'open_ended', 'mixed').optional(),
    timeLimit: Joi.number().integer().min(1).max(480).optional(),
  }),
};

export const getTeachingGuidanceSchema: ValidationSchema = {
  body: Joi.object({
    instructorId: Joi.string().trim().min(1).required(),
    courseId: Joi.string().trim().min(1).required(),
    question: Joi.string().trim().min(1).max(2000).required(),
    context: Joi.object().optional(),
  }),
};

export const trackLearningProgressSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    courseId: Joi.string().trim().min(1).required(),
    metrics: Joi.object({
      completionRate: Joi.number().min(0).max(100).optional(),
      timeSpent: Joi.number().min(0).optional(),
      quizScores: Joi.array().items(Joi.object({
        quizId: Joi.string().required(),
        score: Joi.number().min(0).max(100).required(),
      })).optional(),
      engagementScore: Joi.number().min(0).max(100).optional(),
    }).optional(),
  }),
};

export const getLearningRecommendationsSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    interests: Joi.array().items(Joi.string()).optional(),
    pastCourses: Joi.array().items(Joi.string()).optional(),
    careerGoals: Joi.array().items(Joi.string()).optional(),
    limit: Joi.number().integer().min(1).max(50).optional(),
  }),
};

export const emotionalSupportSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    message: Joi.string().trim().min(1).max(2000).required(),
    context: Joi.object({
      currentActivity: Joi.string().optional(),
      recentScores: Joi.array().items(Joi.number()).optional(),
      timeOnTask: Joi.number().optional(),
    }).optional(),
  }),
};

export const getKnowledgeVisualizationSchema: ValidationSchema = {
  query: Joi.object({
    userId: Joi.string().trim().min(1).optional(),
    topic: Joi.string().trim().optional(),
    depth: Joi.number().integer().min(1).max(10).optional(),
  }),
};

// ---------------------------------------------------------------------------
// Quiz Schemas
// ---------------------------------------------------------------------------

export const createQuizSchema: ValidationSchema = {
  body: Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().max(2000).optional(),
    courseId: Joi.string().trim().min(1).required(),
    timeLimit: Joi.number().integer().min(0).optional(),
    passingScore: Joi.number().min(0).max(100).optional(),
    maxAttempts: Joi.number().integer().min(0).optional(),
    shuffleQuestions: Joi.boolean().optional(),
    showResults: Joi.boolean().optional(),
    questions: Joi.array().items(Joi.object({
      questionText: Joi.string().required(),
      type: Joi.string().valid('multiple_choice', 'true_false', 'short_answer', 'essay').required(),
      points: Joi.number().min(0).required(),
      options: Joi.array().items(Joi.object({
        text: Joi.string().required(),
        isCorrect: Joi.boolean().required(),
      })).optional(),
      correctAnswer: Joi.string().optional(),
    })).min(1).optional(),
  }),
};

export const updateQuizSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string().trim().min(1).required(),
  }),
  body: Joi.object({
    title: Joi.string().trim().min(1).max(200).optional(),
    description: Joi.string().max(2000).optional(),
    timeLimit: Joi.number().integer().min(0).optional(),
    passingScore: Joi.number().min(0).max(100).optional(),
    maxAttempts: Joi.number().integer().min(0).optional(),
    shuffleQuestions: Joi.boolean().optional(),
    showResults: Joi.boolean().optional(),
    published: Joi.boolean().optional(),
  }).min(1),
};

export const submitQuizSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string().trim().min(1).required(),
  }),
  body: Joi.object({
    answers: Joi.array().items(Joi.object({
      questionId: Joi.string().required(),
      answer: Joi.any().required(),
    })).min(1).required(),
    timeSpent: Joi.number().integer().min(0).optional(),
  }),
};

export const regradeSubmissionSchema: ValidationSchema = {
  params: Joi.object({
    submissionId: Joi.string().trim().min(1).required(),
  }),
  body: Joi.object({
    questionId: Joi.string().optional(),
    newScore: Joi.number().min(0).optional(),
    reason: Joi.string().max(500).optional(),
  }),
};

export const toggleQuizPublishSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string().trim().min(1).required(),
  }),
};

// ---------------------------------------------------------------------------
// Holographic Storage Schemas
// ---------------------------------------------------------------------------

export const encodeContentSchema: ValidationSchema = {
  body: Joi.object({
    content: Joi.string().required(),
    contentType: Joi.string().valid('text', 'json', 'binary', 'code').optional(),
    redundancy: Joi.number().integer().min(1).max(10).optional(),
    encryptionKey: Joi.string().optional(),
    metadata: Joi.object().optional(),
  }),
};

export const decodeContentSchema: ValidationSchema = {
  params: Joi.object({
    hash: Joi.string().trim().min(1).required(),
  }),
};

export const parallelAccessSchema: ValidationSchema = {
  body: Joi.object({
    contentHash: Joi.string().trim().min(1).required(),
    accessPattern: Joi.array().items(Joi.string()).min(1).required(),
  }),
};

export const optimizeStorageSchema: ValidationSchema = {
  body: Joi.object({
    targetRedundancy: Joi.number().integer().min(1).max(20).optional(),
    strategy: Joi.string().valid('spatial', 'temporal', 'hybrid').optional(),
    storageNodes: Joi.array().items(Joi.string()).optional(),
  }),
};

// ---------------------------------------------------------------------------
// Event Logger Schemas
// ---------------------------------------------------------------------------

export const logCourseCompletionSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    courseId: Joi.string().trim().min(1).required(),
    completionPercentage: Joi.number().min(0).max(100).required(),
    timeSpent: Joi.number().min(0).optional(),
    grade: Joi.string().optional(),
    certificateId: Joi.string().optional(),
    metadata: Joi.object().optional(),
  }),
};

export const logCredentialIssuanceSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    credentialType: Joi.string().trim().min(1).required(),
    credentialId: Joi.string().trim().min(1).required(),
    issuerId: Joi.string().trim().min(1).required(),
    metadata: Joi.object().optional(),
  }),
};

export const logUserAchievementSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    achievementType: Joi.string().trim().min(1).required(),
    achievementName: Joi.string().trim().min(1).required(),
    points: Joi.number().integer().min(0).optional(),
    metadata: Joi.object().optional(),
  }),
};

export const logProfileUpdateSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    updatedFields: Joi.array().items(Joi.string()).min(1).required(),
    previousValues: Joi.object().optional(),
    metadata: Joi.object().optional(),
  }),
};

export const logCourseEnrollmentSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    courseId: Joi.string().trim().min(1).required(),
    enrollmentType: Joi.string().valid('self', 'admin', 'invited', 'transfer').optional(),
    metadata: Joi.object().optional(),
  }),
};

// ---------------------------------------------------------------------------
// Sync Schemas
// ---------------------------------------------------------------------------

export const registerDeviceSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    deviceName: Joi.string().trim().max(200).required(),
    deviceType: Joi.string().valid('mobile', 'tablet', 'desktop', 'browser').required(),
    platform: Joi.string().optional(),
    pushToken: Joi.string().optional(),
  }),
};

export const heartbeatSchema: ValidationSchema = {
  body: Joi.object({
    deviceId: Joi.string().trim().min(1).required(),
    userId: Joi.string().trim().min(1).required(),
    timestamp: Joi.date().iso().optional(),
    batteryLevel: Joi.number().min(0).max(100).optional(),
    networkStatus: Joi.string().valid('online', 'offline', 'slow').optional(),
  }),
};

export const unregisterDeviceSchema: ValidationSchema = {
  params: Joi.object({
    deviceId: Joi.string().trim().min(1).required(),
  }),
};

export const syncEntitySchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    entityType: Joi.string().trim().min(1).required(),
    entityId: Joi.string().trim().min(1).required(),
    action: Joi.string().valid('create', 'update', 'delete').required(),
    data: Joi.object().required(),
    timestamp: Joi.date().iso().optional(),
  }),
};

export const enqueueSyncSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    entityType: Joi.string().trim().min(1).required(),
    entityId: Joi.string().trim().min(1).required(),
    operation: Joi.string().valid('create', 'update', 'delete').required(),
    payload: Joi.object().required(),
    priority: Joi.number().integer().min(0).max(10).optional(),
  }),
};

export const processQueueSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    deviceId: Joi.string().trim().min(1).required(),
    batchSize: Joi.number().integer().min(1).max(100).optional(),
  }),
};

// ---------------------------------------------------------------------------
// Admin Route Schemas
// ---------------------------------------------------------------------------

export const updateAdminSettingsSchema: ValidationSchema = {
  body: Joi.object({
    category: Joi.string().valid('general', 'security', 'features', 'limits').required()
      .messages({ 'any.required': '"category" is required' }),
    settings: Joi.object().min(1).required()
      .messages({ 'any.required': '"settings" is required', 'object.min': '"settings" must not be empty' }),
  }),
};

export const createAnnouncementSchema: ValidationSchema = {
  body: Joi.object({
    title: Joi.string().trim().min(1).max(200).required()
      .messages({ 'any.required': '"title" is required' }),
    message: Joi.string().trim().min(1).max(5000).required()
      .messages({ 'any.required': '"message" is required' }),
    targetRoles: Joi.array().items(Joi.string()).optional(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
    expiresAt: Joi.date().iso().optional(),
  }),
};

export const initBackupSchema: ValidationSchema = {
  body: Joi.object({
    type: Joi.string().valid('full', 'incremental', 'differential').optional(),
    includeFiles: Joi.boolean().optional(),
    includeDatabase: Joi.boolean().optional(),
  }),
};

// ---------------------------------------------------------------------------
// Authentication Schemas
// ---------------------------------------------------------------------------

export const registerSchema: ValidationSchema = {
  body: Joi.object({
    username: Joi.string().trim().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    displayName: Joi.string().trim().max(100).optional(),
    role: Joi.string().valid('student', 'educator', 'institution', 'admin').optional(),
  }),
};

export const loginSchema: ValidationSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

export const forgotPasswordSchema: ValidationSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
  }),
};

export const resetPasswordSchema: ValidationSchema = {
  body: Joi.object({
    token: Joi.string().trim().min(1).required(),
    password: Joi.string().min(8).max(128).required(),
  }),
};

// ---------------------------------------------------------------------------
// Bookmark Schemas
// ---------------------------------------------------------------------------

export const createBookmarkSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    courseId: Joi.string().trim().min(1).optional(),
    resourceId: Joi.string().trim().min(1).optional(),
    resourceType: Joi.string().valid('course', 'lesson', 'quiz', 'assignment', 'article').required(),
    title: Joi.string().trim().max(300).required(),
    url: Joi.string().uri().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  }),
};

export const deleteBookmarkSchema: ValidationSchema = {
  params: Joi.object({
    bookmarkId: Joi.string().trim().min(1).required(),
  }),
};

// ---------------------------------------------------------------------------
// Offline Queue Schemas
// ---------------------------------------------------------------------------

export const offlineRequestSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    operations: Joi.array().items(Joi.object({
      type: Joi.string().required(),
      payload: Joi.object().required(),
      timestamp: Joi.date().iso().optional(),
    })).min(1).required(),
    deviceId: Joi.string().trim().min(1).optional(),
  }),
};

export const offlineDownloadSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    resources: Joi.array().items(Joi.object({
      resourceType: Joi.string().required(),
      resourceId: Joi.string().required(),
    })).min(1).required(),
    maxSize: Joi.number().integer().min(1).optional(),
  }),
};

// ---------------------------------------------------------------------------
// Gamification Schemas
// ---------------------------------------------------------------------------

export const awardPointsSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    points: Joi.number().integer().min(1).max(10000).required(),
    reason: Joi.string().trim().min(1).max(500).required(),
    activityType: Joi.string().valid('quiz', 'assignment', 'participation', 'achievement', 'streak').optional(),
  }),
};

export const unlockAchievementSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    achievementId: Joi.string().trim().min(1).required(),
  }),
};

// ---------------------------------------------------------------------------
// Search Schemas
// ---------------------------------------------------------------------------

export const voiceSearchSchema: ValidationSchema = {
  body: Joi.object({
    query: Joi.string().trim().min(1).max(1000).required(),
    language: Joi.string().length(2).optional(),
    userId: Joi.string().trim().optional(),
    filters: Joi.object({
      courseId: Joi.string().optional(),
      contentType: Joi.string().optional(),
      dateRange: Joi.object({
        start: Joi.date().iso().optional(),
        end: Joi.date().iso().optional(),
      }).optional(),
    }).optional(),
  }),
};

// ---------------------------------------------------------------------------
// Quantum Encryption Schemas
// ---------------------------------------------------------------------------

export const quantumEncryptSchema: ValidationSchema = {
  body: Joi.object({
    data: Joi.string().required().messages({ 'any.required': '"data" is required' }),
    algorithm: Joi.string().valid('kyber', 'dilithium', 'falcon', 'sphincs', 'bike', 'hqc').optional(),
    securityLevel: Joi.number().integer().valid(128, 192, 256).optional(),
    metadata: Joi.object().optional(),
  }),
};

export const quantumDecryptSchema: ValidationSchema = {
  body: Joi.object({
    ciphertext: Joi.string().required().messages({ 'any.required': '"ciphertext" is required' }),
    keyId: Joi.string().trim().min(1).required(),
    algorithm: Joi.string().optional(),
  }),
};

export const quantumKeyGenSchema: ValidationSchema = {
  body: Joi.object({
    algorithm: Joi.string().valid('kyber', 'dilithium', 'falcon', 'sphincs').optional(),
    securityLevel: Joi.number().integer().valid(128, 192, 256).optional(),
    userId: Joi.string().trim().optional(),
  }),
};

// ---------------------------------------------------------------------------
// Fraud Detection Schemas
// ---------------------------------------------------------------------------

export const analyzeFraudSchema: ValidationSchema = {
  body: Joi.object({
    transactionId: Joi.string().trim().min(1).required(),
    userId: Joi.string().trim().min(1).required(),
    transactionData: Joi.object({
      amount: Joi.number().positive().required(),
      currency: Joi.string().length(3).optional(),
      timestamp: Joi.date().iso().optional(),
      ipAddress: Joi.string().ip().optional(),
      userAgent: Joi.string().optional(),
      location: Joi.object({
        lat: Joi.number().min(-90).max(90).optional(),
        lng: Joi.number().min(-180).max(180).optional(),
        country: Joi.string().length(2).optional(),
      }).optional(),
    }).required(),
  }),
};

// ---------------------------------------------------------------------------
// RBAC Schemas
// ---------------------------------------------------------------------------

export const assignRoleSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    role: Joi.string().valid('student', 'educator', 'institution', 'admin', 'superadmin').required(),
    scope: Joi.string().optional(),
  }),
};

// ---------------------------------------------------------------------------
// Content Upload Schemas
// ---------------------------------------------------------------------------

export const uploadContentSchema: ValidationSchema = {
  body: Joi.object({
    courseId: Joi.string().trim().min(1).required(),
    title: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().max(2000).optional(),
    contentType: Joi.string().valid('video', 'document', 'image', 'audio', 'interactive', 'other').required(),
    tags: Joi.array().items(Joi.string()).optional(),
    metadata: Joi.object().optional(),
  }),
};

// ---------------------------------------------------------------------------
// Course Schemas
// ---------------------------------------------------------------------------

export const createCourseSchema: ValidationSchema = {
  body: Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().max(5000).required(),
    category: Joi.string().trim().min(1).required(),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
    price: Joi.number().min(0).optional(),
    imageUrl: Joi.string().uri().optional(),
    prerequisites: Joi.array().items(Joi.string()).optional(),
    learningObjectives: Joi.array().items(Joi.string()).optional(),
    syllabus: Joi.array().items(Joi.object({
      title: Joi.string().required(),
      description: Joi.string().optional(),
      duration: Joi.number().optional(),
    })).optional(),
  }),
};

// ---------------------------------------------------------------------------
// ACO (Ant Colony Optimization) Schemas
// ---------------------------------------------------------------------------

export const acoOptimizeSchema: ValidationSchema = {
  body: Joi.object({
    problemType: Joi.string().valid('routing', 'scheduling', 'resource_allocation', 'curriculum_planning').required(),
    parameters: Joi.object({
      nodes: Joi.number().integer().min(1).max(10000).optional(),
      iterations: Joi.number().integer().min(1).max(1000).optional(),
      antCount: Joi.number().integer().min(1).max(500).optional(),
      alpha: Joi.number().min(0).max(10).optional(),
      beta: Joi.number().min(0).max(10).optional(),
      evaporationRate: Joi.number().min(0).max(1).optional(),
    }).optional(),
    constraints: Joi.object().optional(),
  }),
};

export const acoStatusSchema: ValidationSchema = {
  params: Joi.object({
    jobId: Joi.string().trim().min(1).required(),
  }),
};

// ---------------------------------------------------------------------------
// Autonomous Agents Schemas
// ---------------------------------------------------------------------------

export const supportTicketSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    category: Joi.string().valid('technical', 'billing', 'academic', 'account', 'other').required(),
    subject: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().trim().min(10).max(5000).required(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
    attachments: Joi.array().items(Joi.string()).optional(),
  }),
};

// ---------------------------------------------------------------------------
// Federated Learning Schemas (additional JS-route endpoints)
// ---------------------------------------------------------------------------

export const federatedLearningRoundSchema: ValidationSchema = {
  body: Joi.object({
    sessionId: Joi.string().trim().min(1).required(),
    roundNumber: Joi.number().integer().min(0).required(),
    modelWeights: Joi.object().required(),
    metrics: Joi.object({
      accuracy: Joi.number().min(0).max(100).optional(),
      loss: Joi.number().min(0).optional(),
      participants: Joi.number().integer().min(0).optional(),
    }).optional(),
  }),
};

// ---------------------------------------------------------------------------
// Prediction Schemas
// ---------------------------------------------------------------------------

export const predictStudentPerformanceSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    courseId: Joi.string().trim().min(1).required(),
    features: Joi.object({
      pastQuizScores: Joi.array().items(Joi.number().min(0).max(100)).optional(),
      assignmentScores: Joi.array().items(Joi.number().min(0).max(100)).optional(),
      timeSpent: Joi.number().min(0).optional(),
      engagementMetrics: Joi.object({
        loginFrequency: Joi.number().optional(),
        forumPosts: Joi.number().optional(),
        resourceAccesses: Joi.number().optional(),
      }).optional(),
      demographicData: Joi.object().optional(),
    }).required(),
    predictionType: Joi.string().valid('dropout', 'grade', 'completion_time', 'engagement').required(),
  }),
};

export const predictCourseDemandSchema: ValidationSchema = {
  body: Joi.object({
    courseId: Joi.string().trim().min(1).required(),
    historicalData: Joi.object({
      enrollments: Joi.array().items(Joi.object({
        date: Joi.date().iso().required(),
        count: Joi.number().integer().min(0).required(),
      })).optional(),
      completions: Joi.array().items(Joi.object({
        date: Joi.date().iso().required(),
        count: Joi.number().integer().min(0).required(),
      })).optional(),
    }).optional(),
    predictionHorizon: Joi.number().integer().min(7).max(365).optional(),
  }),
};

// ---------------------------------------------------------------------------
// Recommendation Schemas
// ---------------------------------------------------------------------------

export const getRecommendationsSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    context: Joi.object({
      currentCourse: Joi.string().optional(),
      completedCourses: Joi.array().items(Joi.string()).optional(),
      interests: Joi.array().items(Joi.string()).optional(),
      careerPath: Joi.string().optional(),
      skillLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
    }).optional(),
    limit: Joi.number().integer().min(1).max(50).optional(),
    strategy: Joi.string().valid('collaborative', 'content_based', 'hybrid', 'trending').optional(),
  }),
};

// ---------------------------------------------------------------------------
// Optimization Schemas
// ---------------------------------------------------------------------------

export const optimizeResourceSchema: ValidationSchema = {
  body: Joi.object({
    resourceId: Joi.string().trim().min(1).required(),
    resourceType: Joi.string().valid('compute', 'storage', 'bandwidth', 'memory').required(),
    constraints: Joi.object({
      maxCost: Joi.number().min(0).optional(),
      minPerformance: Joi.number().min(0).max(100).optional(),
      timeWindow: Joi.object({
        start: Joi.date().iso().optional(),
        end: Joi.date().iso().optional(),
      }).optional(),
    }).optional(),
    objectives: Joi.array().items(Joi.string().valid('cost', 'performance', 'latency', 'reliability')).min(1).optional(),
  }),
};

// ---------------------------------------------------------------------------
// Swarm Learning Schemas
// ---------------------------------------------------------------------------

export const swarmLearningInitSchema: ValidationSchema = {
  body: Joi.object({
    modelType: Joi.string().trim().min(1).max(100).required(),
    swarmSize: Joi.number().integer().min(2).max(1000).required(),
    consensusProtocol: Joi.string().valid('gossip', 'all_reduce', 'ring', 'tree').optional(),
    topology: Joi.string().valid('mesh', 'star', 'ring', 'random').optional(),
    learningRate: Joi.number().positive().max(1).optional(),
    rounds: Joi.number().integer().min(1).max(10000).optional(),
  }),
};

export const swarmLearningJoinSchema: ValidationSchema = {
  body: Joi.object({
    sessionId: Joi.string().trim().min(1).required(),
    peerId: Joi.string().trim().min(1).required(),
    endpoint: Joi.string().uri().required(),
    capabilities: Joi.object({
      maxBatchSize: Joi.number().integer().min(1).optional(),
      supportedAlgorithms: Joi.array().items(Joi.string()).optional(),
    }).optional(),
  }),
};

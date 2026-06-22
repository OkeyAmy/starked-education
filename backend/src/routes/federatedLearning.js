const express = require('express');
const router = express.Router();
const FederatedLearningController = require('../controllers/federatedLearningController');
const { authenticateToken: auth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const { validateRequestSchema } = require('../middleware/validateRequestSchema');

// Initialize controller
const flController = new FederatedLearningController();

// Rate limiting for sensitive operations
const sensitiveOperationLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many requests, please try again later'
  }
});

const modelUpdateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 model updates per minute
  message: {
    error: 'Too many model updates, please try again later'
  }
});

const federatedSessionSchema = {
  body: Joi.object({
    modelType: Joi.string().trim().min(1).max(100).required(),
    minParticipants: Joi.number().integer().min(1).max(10000).required(),
    rounds: Joi.number().integer().min(1).max(10000).required(),
    aggregationStrategy: Joi.string().valid('fedAvg', 'fedProx', 'scaffold', 'mime').required(),
  })
};

const federatedParticipantSchema = {
  body: Joi.object({
    sessionId: Joi.string().trim().min(1).required(),
    publicKey: Joi.string().trim().min(1).max(1024).required(),
    institutionId: Joi.string().trim().min(1).required(),
    endpoint: Joi.string().uri().required(),
  })
};

const federatedRoundSchema = {
  body: Joi.object({
    sessionId: Joi.string().trim().min(1).required(),
    roundNumber: Joi.number().integer().min(0).required(),
  })
};

const modelUpdateSchema = {
  params: Joi.object({
    participantId: Joi.string().trim().min(1).required(),
  }),
  body: Joi.object({
    roundNumber: Joi.number().integer().min(0).required(),
    modelWeights: Joi.object().required(),
    metrics: Joi.object().optional(),
  })
};

const rollbackModelSchema = {
  params: Joi.object({
    versionId: Joi.string().trim().min(1).required(),
  })
};

const resetPrivacyBudgetSchema = {
  body: Joi.object({
    reason: Joi.string().max(500).optional(),
  })
};

const validateModelSchema = {
  body: Joi.object({
    modelId: Joi.string().trim().min(1).required(),
    metrics: Joi.object().optional(),
  })
};

const shutdownSchema = {
  body: Joi.object({
    reason: Joi.string().max(500).optional(),
  })
};

// Session Management Routes
router.post('/sessions', auth, validateRequestSchema(federatedSessionSchema), async (req, res) => {
  await flController.initializeSession(req, res);
});

router.get('/sessions/:sessionId/status', auth, async (req, res) => {
  await flController.getSessionStatus(req, res);
});

// Participant Management Routes
router.post('/participants', auth, validateRequestSchema(federatedParticipantSchema), async (req, res) => {
  await flController.registerParticipant(req, res);
});

router.get('/participants', auth, async (req, res) => {
  await flController.getParticipants(req, res);
});

// Round Management Routes
router.post('/rounds', auth, sensitiveOperationLimit, validateRequestSchema(federatedRoundSchema), async (req, res) => {
  await flController.startRound(req, res);
});

router.post('/participants/:participantId/updates', auth, modelUpdateLimit, validateRequestSchema(modelUpdateSchema), async (req, res) => {
  await flController.submitModelUpdate(req, res);
});

router.get('/rounds/history', auth, async (req, res) => {
  await flController.getRoundHistory(req, res);
});

// Model Management Routes
router.get('/models/versions', auth, async (req, res) => {
  await flController.getModelVersions(req, res);
});

router.post('/models/rollback/:versionId', auth, sensitiveOperationLimit, validateRequestSchema(rollbackModelSchema), async (req, res) => {
  await flController.rollbackModel(req, res);
});

router.get('/models/compare', auth, async (req, res) => {
  await flController.compareModels(req, res);
});

// Analytics Routes
router.get('/analytics', auth, async (req, res) => {
  await flController.getAnalytics(req, res);
});

router.get('/analytics/export', auth, async (req, res) => {
  await flController.exportAnalytics(req, res);
});

// Privacy Management Routes
router.get('/privacy/status', auth, async (req, res) => {
  await flController.getPrivacyStatus(req, res);
});

router.post('/privacy/reset-budget', auth, sensitiveOperationLimit, validateRequestSchema(resetPrivacyBudgetSchema), async (req, res) => {
  await flController.resetPrivacyBudget(req, res);
});

// Validation Routes
router.post('/validation/validate', auth, validateRequestSchema(validateModelSchema), async (req, res) => {
  await flController.validateModel(req, res);
});

router.get('/validation/stats', auth, async (req, res) => {
  await flController.getValidationStats(req, res);
});

// System Health Routes
router.get('/health', async (req, res) => {
  await flController.getSystemHealth(req, res);
});

router.post('/shutdown', auth, sensitiveOperationLimit, validateRequestSchema(shutdownSchema), async (req, res) => {
  await flController.shutdown(req, res);
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Federated Learning Route Error:', error);
  
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

module.exports = router;

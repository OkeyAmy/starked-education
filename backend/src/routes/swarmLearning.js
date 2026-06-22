const express = require('express');
const router = express.Router();
const SwarmLearningController = require('../controllers/swarmLearningController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const Joi = require('joi');
const { validateRequestSchema } = require('../middleware/validateRequestSchema');
const rateLimit = require('express-rate-limit');

// Initialize controller
const swarmController = new SwarmLearningController();

// Rate limiting for sensitive operations
const sensitiveOperationLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many requests, please try again later'
  }
});

const agentOperationLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 agent operations per minute
  message: {
    error: 'Too many agent operations, please try again later'
  }
});

// Validation schemas
const initializeSchema = {
  body: Joi.object({
    modelType: Joi.string().trim().min(1).max(100).required(),
    swarmSize: Joi.number().integer().min(2).max(1000).required(),
    consensusProtocol: Joi.string().valid('gossip', 'all_reduce', 'ring', 'tree').optional(),
    topology: Joi.string().valid('mesh', 'star', 'ring', 'random').optional(),
  })
};

const shutdownSchema = {
  body: Joi.object({
    reason: Joi.string().max(500).optional(),
  })
};

const createSwarmSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(200).required(),
    taskType: Joi.string().trim().min(1).required(),
    config: Joi.object({
      minParticipants: Joi.number().integer().min(1).optional(),
      maxParticipants: Joi.number().integer().min(1).optional(),
      learningRate: Joi.number().positive().optional(),
    }).optional(),
  })
};

const startTaskSchema = {
  params: Joi.object({
    taskId: Joi.string().trim().min(1).required(),
  }),
  body: Joi.object({
    participants: Joi.array().items(Joi.string()).min(1).optional(),
    parameters: Joi.object().optional(),
  })
};

const registerAgentSchema = {
  body: Joi.object({
    swarmId: Joi.string().trim().min(1).required(),
    agentId: Joi.string().trim().min(1).required(),
    endpoint: Joi.string().uri().optional(),
    capabilities: Joi.object().optional(),
  })
};

const acknowledgeAlertSchema = {
  params: Joi.object({
    alertId: Joi.string().trim().min(1).required(),
  })
};

const updateConfigSchema = {
  body: Joi.object({
    key: Joi.string().trim().min(1).required(),
    value: Joi.any().required(),
  })
};

// System Management Routes
router.post('/initialize', authenticateToken, requireAdmin, sensitiveOperationLimit, validateRequestSchema(initializeSchema), async (req, res) => {
  await swarmController.initialize(req, res);
});

router.post('/shutdown', authenticateToken, requireAdmin, sensitiveOperationLimit, validateRequestSchema(shutdownSchema), async (req, res) => {
  await swarmController.shutdown(req, res);
});

// Swarm Management Routes
router.post('/swarms', authenticateToken, validateRequestSchema(createSwarmSchema), async (req, res) => {
  await swarmController.createSwarm(req, res);
});

router.post('/swarms/:taskId/start', authenticateToken, validateRequestSchema(startTaskSchema), async (req, res) => {
  await swarmController.startSwarmLearning(req, res);
});

router.get('/swarms/status', authenticateToken, async (req, res) => {
  await swarmController.getSwarmStatus(req, res);
});

// Agent Management Routes
router.post('/agents', authenticateToken, agentOperationLimit, validateRequestSchema(registerAgentSchema), async (req, res) => {
  await swarmController.registerAgent(req, res);
});

router.get('/agents/:agentId', authenticateToken, async (req, res) => {
  await swarmController.getAgentDetails(req, res);
});

// Task Management Routes
router.get('/tasks/:taskId', authenticateToken, async (req, res) => {
  await swarmController.getTaskDetails(req, res);
});

// Emergent Behavior Routes
router.get('/behaviors', authenticateToken, async (req, res) => {
  await swarmController.getEmergentBehaviors(req, res);
});

// Analytics Routes
router.get('/analytics', authenticateToken, async (req, res) => {
  await swarmController.getAnalytics(req, res);
});

router.get('/analytics/report', authenticateToken, async (req, res) => {
  await swarmController.getReport(req, res);
});

router.get('/analytics/export', authenticateToken, async (req, res) => {
  await swarmController.exportData(req, res);
});

// Alert Management Routes
router.get('/alerts', authenticateToken, async (req, res) => {
  await swarmController.getAlerts(req, res);
});

router.post('/alerts/:alertId/acknowledge', authenticateToken, validateRequestSchema(acknowledgeAlertSchema), async (req, res) => {
  await swarmController.acknowledgeAlert(req, res);
});

// Configuration Routes
router.put('/configuration', authenticateToken, requireAdmin, sensitiveOperationLimit, validateRequestSchema(updateConfigSchema), async (req, res) => {
  await swarmController.updateConfiguration(req, res);
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Basic health check - in a real implementation, this would check all components
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'swarm-learning'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Swarm Learning Route Error:', error);
  
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

module.exports = router;

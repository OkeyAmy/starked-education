const express = require('express');
const router = express.Router();
const OptimizationController = require('../controllers/optimizationController');
const Joi = require('joi');
const { validateRequestSchema } = require('../middleware/validateRequestSchema');

const initializeSchema = {
  body: Joi.object({
    config: Joi.object().optional(),
    algorithm: Joi.string().valid('aco', 'pso', 'genetic', 'simulated_annealing').optional(),
    parameters: Joi.object().optional(),
  })
};

const learningPathSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).optional(),
    startCourse: Joi.string().trim().min(1).required(),
    endCourse: Joi.string().trim().min(1).required(),
    preferences: Joi.object().optional(),
    constraints: Joi.object().optional(),
  })
};

const resourceOptimizeSchema = {
  body: Joi.object({
    resources: Joi.array().min(1).required(),
    demands: Joi.array().optional(),
    constraints: Joi.array().optional(),
    objectives: Joi.array().optional(),
  })
};

const replanningRegisterSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).required(),
    startCourse: Joi.string().trim().min(1).required(),
    endCourse: Joi.string().trim().min(1).required(),
    preferences: Joi.object().optional(),
  })
};

const updateEnvironmentSchema = {
  body: Joi.object({
    userId: Joi.string().trim().min(1).optional(),
    changes: Joi.array().min(1).required(),
  })
};

const swarmInitSchema = {
  body: Joi.object({
    swarmSize: Joi.number().integer().min(2).max(1000).required(),
    problemType: Joi.string().valid('optimization', 'routing', 'scheduling').optional(),
    config: Joi.object().optional(),
  })
};

// Initialize optimization controller
const optimizationController = new OptimizationController();

// Initialize optimization services
router.post('/initialize', validateRequestSchema(initializeSchema), async (req, res) => {
  await optimizationController.initialize(req, res);
});

// Learning Path Optimization
router.post('/learning-paths/optimize', validateRequestSchema(learningPathSchema), async (req, res) => {
  await optimizationController.optimizeLearningPath(req, res);
});

// Resource Allocation Optimization
router.post('/resources/optimize', validateRequestSchema(resourceOptimizeSchema), async (req, res) => {
  await optimizationController.optimizeResourceAllocation(req, res);
});

// Dynamic Replanning
router.post('/replanning/register', validateRequestSchema(replanningRegisterSchema), async (req, res) => {
  await optimizationController.registerPath(req, res);
});

router.post('/replanning/update-environment', validateRequestSchema(updateEnvironmentSchema), async (req, res) => {
  await optimizationController.updateEnvironmentState(req, res);
});

// Swarm Coordination
router.post('/swarm/initialize', validateRequestSchema(swarmInitSchema), async (req, res) => {
  await optimizationController.initializeSwarm(req, res);
});

// Analytics and Visualization
router.get('/analytics', async (req, res) => {
  await optimizationController.getAnalytics(req, res);
});

router.get('/visualizations/:vizId', async (req, res) => {
  await optimizationController.getVisualization(req, res);
});

router.get('/visualizations', async (req, res) => {
  await optimizationController.getAllVisualizations(req, res);
});

router.get('/realtime', async (req, res) => {
  await optimizationController.getRealTimeData(req, res);
});

// Session Management
router.get('/sessions/:sessionId', async (req, res) => {
  await optimizationController.getSessionStatus(req, res);
});

// Data Export
router.get('/export', async (req, res) => {
  await optimizationController.exportData(req, res);
});

// Health Check
router.get('/health', async (req, res) => {
  await optimizationController.healthCheck(req, res);
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Optimization API error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date()
  });
});

module.exports = router;

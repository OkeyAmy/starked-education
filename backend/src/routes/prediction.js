const express = require('express');
const router = express.Router();
const PredictionController = require('../controllers/predictionController');
const Joi = require('joi');
const { validateRequestSchema } = require('../middleware/validateRequestSchema');

// Initialize controller
const predictionController = new PredictionController();

const studentPredictSchema = {
  params: Joi.object({
    studentId: Joi.string().trim().min(1).required(),
  }),
  body: Joi.object({
    studentData: Joi.object().required(),
  })
};

const batchPredictSchema = {
  body: Joi.object({
    students: Joi.array().min(1).max(100).required(),
  })
};

const interventionSchema = {
  params: Joi.object({
    studentId: Joi.string().trim().min(1).required(),
  }),
  body: Joi.object({
    riskFactors: Joi.array().items(Joi.object()).optional(),
    preferences: Joi.object().optional(),
  })
};

const interventionStatusSchema = {
  params: Joi.object({
    studentId: Joi.string().trim().min(1).required(),
    interventionId: Joi.string().trim().min(1).required(),
  }),
  body: Joi.object({
    status: Joi.string().valid('pending', 'active', 'completed', 'cancelled').required(),
    notes: Joi.string().optional(),
  })
};

const learningPathOptimizeSchema = {
  params: Joi.object({
    studentId: Joi.string().trim().min(1).required(),
  }),
  body: Joi.object({
    currentPath: Joi.array().optional(),
    goals: Joi.object().optional(),
  })
};

const trainModelsSchema = {
  body: Joi.object({
    modelType: Joi.string().valid('all', 'performance', 'risk', 'intervention').optional(),
    forceRetrain: Joi.boolean().optional(),
  })
};

// Prediction routes
router.post('/students/:studentId/predict', 
  validateRequestSchema(studentPredictSchema),
  predictionController.predictStudentOutcomes.bind(predictionController)
);

router.post('/batch/predict',
  validateRequestSchema(batchPredictSchema),
  predictionController.predictBatchOutcomes.bind(predictionController)
);

// At-risk student identification
router.post('/at-risk/identify',
  validateRequestSchema(batchPredictSchema),
  predictionController.identifyAtRiskStudents.bind(predictionController)
);

// Intervention recommendations
router.post('/students/:studentId/interventions',
  validateRequestSchema(interventionSchema),
  predictionController.generateInterventions.bind(predictionController)
);

router.put('/students/:studentId/interventions/:interventionId/status',
  validateRequestSchema(interventionStatusSchema),
  predictionController.updateInterventionStatus.bind(predictionController)
);

router.get('/students/:studentId/interventions/effectiveness',
  predictionController.getInterventionEffectiveness.bind(predictionController)
);

// Learning path optimization
router.post('/students/:studentId/learning-path/optimize',
  validateRequestSchema(learningPathOptimizeSchema),
  predictionController.optimizeLearningPath.bind(predictionController)
);

// Model management
router.get('/models/accuracy',
  predictionController.getModelAccuracy.bind(predictionController)
);

router.post('/models/train',
  validateRequestSchema(trainModelsSchema),
  predictionController.trainModels.bind(predictionController)
);

// Comprehensive analytics
router.post('/students/:studentId/analytics',
  validateRequestSchema(studentPredictSchema),
  predictionController.getStudentAnalytics.bind(predictionController)
);

// Health check
router.get('/health',
  predictionController.healthCheck.bind(predictionController)
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Prediction route error:', error);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error in prediction service',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;

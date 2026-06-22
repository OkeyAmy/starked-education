import { Router } from 'express';
import { AGITutorController } from '../controllers/agiTutorController';
import { validateRequestSchema } from '../middleware/validateRequestSchema';
import { generateSessionSchema, processResponseSchema, generateAssessmentSchema, getTeachingGuidanceSchema, trackLearningProgressSchema, getLearningRecommendationsSchema, emotionalSupportSchema, getKnowledgeVisualizationSchema } from '../middleware/validation';

const router = Router();
const agiTutorController = new AGITutorController();

/**
 * AGI Tutor Routes
 * Implements universal learning capabilities with artificial general intelligence
 */

// Generate personalized learning session
router.post('/session', validateRequestSchema(generateSessionSchema), async (req, res) => {
  await agiTutorController.generateLearningSession(req, res);
});

// Process student response and provide adaptive feedback
router.post('/response', validateRequestSchema(processResponseSchema), async (req, res) => {
  await agiTutorController.processStudentResponse(req, res);
});

// Generate comprehensive assessment
router.post('/assessment', validateRequestSchema(generateAssessmentSchema), async (req, res) => {
  await agiTutorController.generateAssessment(req, res);
});

// Get real-time teaching guidance for instructors
router.post('/guidance', validateRequestSchema(getTeachingGuidanceSchema), async (req, res) => {
  await agiTutorController.getTeachingGuidance(req, res);
});

// Get knowledge visualization and connections
router.get('/visualization', validateRequestSchema(getKnowledgeVisualizationSchema), async (req, res) => {
  await agiTutorController.getKnowledgeVisualization(req, res);
});

// Track learning progress and predict outcomes
router.post('/progress', validateRequestSchema(trackLearningProgressSchema), async (req, res) => {
  await agiTutorController.trackLearningProgress(req, res);
});

// Get personalized learning recommendations
router.post('/recommendations', validateRequestSchema(getLearningRecommendationsSchema), async (req, res) => {
  await agiTutorController.getLearningRecommendations(req, res);
});

// Handle emotional support and motivation
router.post('/emotional-support', validateRequestSchema(emotionalSupportSchema), async (req, res) => {
  await agiTutorController.provideEmotionalSupport(req, res);
});

export default router;

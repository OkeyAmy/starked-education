import { Router } from "express";
import quizController from "../controllers/quizController";
import { requirePermission } from "../middleware/rbac";
import { PERMISSIONS } from "../utils/roles";
import { asyncHandler } from "../middleware/errorHandler";
import { validateRequestSchema } from "../middleware/validateRequestSchema";
import { createQuizSchema, updateQuizSchema, submitQuizSchema, toggleQuizPublishSchema, regradeSubmissionSchema } from "../middleware/validation";

const router: Router = Router();

// Helper to wrap controller methods with async error handling
const wrap = (fn: any) => asyncHandler(fn.bind(quizController));

// Quiz CRUD endpoints
router.post(
  "/",
  requirePermission(PERMISSIONS.QUIZ_CREATE),
  validateRequestSchema(createQuizSchema),
  wrap(quizController.createQuiz),
);
router.get(
  "/",
  requirePermission(PERMISSIONS.QUIZ_READ),
  wrap(quizController.getQuizzes),
);
router.get(
  "/:id",
  requirePermission(PERMISSIONS.QUIZ_READ),
  wrap(quizController.getQuizById),
);
router.put(
  "/:id",
  requirePermission(PERMISSIONS.QUIZ_UPDATE),
  validateRequestSchema(updateQuizSchema),
  wrap(quizController.updateQuiz),
);
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.QUIZ_DELETE),
  wrap(quizController.deleteQuiz),
);

// Quiz publishing
router.post(
  "/:id/publish",
  requirePermission(PERMISSIONS.QUIZ_UPDATE),
  validateRequestSchema(toggleQuizPublishSchema),
  wrap(quizController.toggleQuizPublish),
);

// Quiz submission and grading
router.post(
  "/:id/submit",
  requirePermission(PERMISSIONS.PROGRESS_TRACK),
  validateRequestSchema(submitQuizSchema),
  wrap(quizController.submitQuiz),
);
router.get(
  "/:id/submission",
  requirePermission(PERMISSIONS.PROGRESS_TRACK),
  wrap(quizController.getUserSubmission),
);
router.get(
  "/:id/results",
  requirePermission(PERMISSIONS.PROGRESS_TRACK),
  wrap(quizController.getQuizResults),
);
router.get(
  "/:id/statistics",
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  wrap(quizController.getQuizStatistics),
);
router.get(
  "/:id/grading-statistics",
  requirePermission(PERMISSIONS.COURSE_GRADE),
  wrap(quizController.getGradingStatistics),
);

// Submission management
router.get(
  "/submissions/:submissionId",
  requirePermission(PERMISSIONS.COURSE_GRADE),
  wrap(quizController.getSubmissionById),
);
router.post(
  "/submissions/:submissionId/regrade",
  requirePermission(PERMISSIONS.COURSE_GRADE),
  validateRequestSchema(regradeSubmissionSchema),
  wrap(quizController.regradeSubmission),
);

// Health check
router.get("/health", wrap(quizController.healthCheck));

export default router;

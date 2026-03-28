import { Router } from "express";
import quizController from "../controllers/quizController";
import { requirePermission } from "../middleware/rbac";
import { PERMISSIONS } from "../utils/roles";

const router: Router = Router();

// Quiz CRUD endpoints
router.post(
  "/",
  requirePermission(PERMISSIONS.QUIZ_CREATE),
  quizController.createQuiz,
);
router.get(
  "/",
  requirePermission(PERMISSIONS.QUIZ_READ),
  quizController.getQuizzes,
);
router.get(
  "/:id",
  requirePermission(PERMISSIONS.QUIZ_READ),
  quizController.getQuizById,
);
router.put(
  "/:id",
  requirePermission(PERMISSIONS.QUIZ_UPDATE),
  quizController.updateQuiz,
);
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.QUIZ_DELETE),
  quizController.deleteQuiz,
);

// Quiz publishing
router.post(
  "/:id/publish",
  requirePermission(PERMISSIONS.QUIZ_UPDATE),
  quizController.toggleQuizPublish,
);

// Quiz submission and grading
router.post(
  "/:id/submit",
  requirePermission(PERMISSIONS.PROGRESS_TRACK),
  quizController.submitQuiz,
);
router.get(
  "/:id/submission",
  requirePermission(PERMISSIONS.PROGRESS_TRACK),
  quizController.getUserSubmission,
);
router.get(
  "/:id/results",
  requirePermission(PERMISSIONS.PROGRESS_TRACK),
  quizController.getQuizResults,
);
router.get(
  "/:id/statistics",
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  quizController.getQuizStatistics,
);
router.get(
  "/:id/grading-statistics",
  requirePermission(PERMISSIONS.COURSE_GRADE),
  quizController.getGradingStatistics,
);

// Submission management
router.get(
  "/submissions/:submissionId",
  requirePermission(PERMISSIONS.COURSE_GRADE),
  quizController.getSubmissionById,
);
router.post(
  "/submissions/:submissionId/regrade",
  requirePermission(PERMISSIONS.COURSE_GRADE),
  quizController.regradeSubmission,
);

// Health check
router.get("/health", quizController.healthCheck);

export default router;

import { Router } from "express";
import { eventLoggerController } from "../controllers/eventLoggerController";
import { validateRequestSchema } from "../middleware/validateRequestSchema";
import { logCourseCompletionSchema, logCredentialIssuanceSchema, logUserAchievementSchema, logProfileUpdateSchema, logCourseEnrollmentSchema } from "../middleware/validation";

const router: Router = Router();

// Event logging endpoints
router.post("/course-completion", validateRequestSchema(logCourseCompletionSchema), eventLoggerController.logCourseCompletion);
router.post(
  "/credential-issuance",
  validateRequestSchema(logCredentialIssuanceSchema),
  eventLoggerController.logCredentialIssuance,
);
router.post("/user-achievement", validateRequestSchema(logUserAchievementSchema), eventLoggerController.logUserAchievement);
router.post("/profile-update", validateRequestSchema(logProfileUpdateSchema), eventLoggerController.logProfileUpdate);
router.post("/course-enrollment", validateRequestSchema(logCourseEnrollmentSchema), eventLoggerController.logCourseEnrollment);

// Event retrieval endpoints
router.get("/event/:eventId", eventLoggerController.getEventById);
router.get("/user/:userId/events", eventLoggerController.getUserEvents);
router.get("/type/:eventType", eventLoggerController.getEventsByType);
router.get("/recent", eventLoggerController.getRecentEvents);
router.get("/count", eventLoggerController.getEventCount);
router.get("/search", eventLoggerController.searchEvents);

// Verification endpoints
router.get("/verify/:eventId", eventLoggerController.verifyEvent);
router.get(
  "/audit-report/:userId",
  eventLoggerController.generateUserAuditReport,
);

export default router;

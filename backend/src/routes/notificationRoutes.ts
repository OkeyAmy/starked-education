import express, { Router } from "express";
import { notificationController } from "../controllers/notificationController";
import { validateRequestSchema } from "../middleware/validateRequestSchema";
import { getNotificationsSchema, markAsReadSchema, markAllAsReadSchema, updatePreferencesSchema, deleteNotificationSchema } from "../middleware/validation";

const router: Router = express.Router();

// Get notification history
router.get("/:userId", validateRequestSchema(getNotificationsSchema), notificationController.getNotifications);

// Mark as read
router.patch("/:notificationId/read", validateRequestSchema(markAsReadSchema), notificationController.markAsRead);

// Mark all as read
router.patch("/read-all", validateRequestSchema(markAllAsReadSchema), notificationController.markAllAsRead);

// Preferences
router.get("/:userId/preferences", validateRequestSchema(getNotificationsSchema), notificationController.getPreferences);
router.put("/:userId/preferences", validateRequestSchema(updatePreferencesSchema), notificationController.updatePreferences);

// Delete
router.delete("/:notificationId", validateRequestSchema(deleteNotificationSchema), notificationController.deleteNotification);

export default router;

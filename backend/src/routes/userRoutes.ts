import { Router } from "express";
import { userController } from "../controllers/userController";
import { validateRequestSchema } from "../middleware/validateRequestSchema";
import { getProfileSchema, updateProfileSchema, getUserSettingsSchema, updateUserSettingsSchema } from "../middleware/validation";

const router: Router = Router();

/**
 * @route GET /api/users/profile/:address
 * @desc Get user profile by Stellar address
 */
router.get(
  "/profile/:address",
  validateRequestSchema(getProfileSchema),
  userController.getProfile,
);

/**
 * @route PUT /api/users/profile/:address
 * @desc Update user profile
 */
router.put(
  "/profile/:address",
  validateRequestSchema(updateProfileSchema),
  userController.updateProfile,
);

/**
 * @route GET /api/users/settings/:userId
 * @desc Get user settings
 */
router.get(
  "/settings/:userId",
  validateRequestSchema(getUserSettingsSchema),
  userController.getSettings,
);

/**
 * @route PUT /api/users/settings/:userId
 * @desc Update user settings
 */
router.put(
  "/settings/:userId",
  validateRequestSchema(updateUserSettingsSchema),
  userController.updateSettings,
);

router.get("/profile/:address/achievements", userController.getAchievements);
router.get("/profile/:address/stats", userController.getStats);

export default router;

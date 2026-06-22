import { Router } from "express";
import * as syncController from "../controllers/syncController";
import { validateRequestSchema } from "../middleware/validateRequestSchema";
import { registerDeviceSchema, heartbeatSchema, unregisterDeviceSchema, syncEntitySchema, enqueueSyncSchema, processQueueSchema } from "../middleware/validation";

const router: Router = Router();

// Device registration and management
router.post("/devices/register", validateRequestSchema(registerDeviceSchema), syncController.registerDevice);
router.post("/devices/heartbeat", validateRequestSchema(heartbeatSchema), syncController.heartbeat);
router.delete("/devices/:deviceId", validateRequestSchema(unregisterDeviceSchema), syncController.unregisterDevice);
router.get("/users/:userId/devices", syncController.getDevices);

// Sync status tracking
router.get("/users/:userId/status", syncController.getSyncStatus);

// Entity sync (real-time sync when change is detected)
router.post("/sync", validateRequestSchema(syncEntitySchema), syncController.syncEntity);

// Offline queue
router.post("/queue", validateRequestSchema(enqueueSyncSchema), syncController.enqueueSync);
router.post("/queue/process", validateRequestSchema(processQueueSchema), syncController.processQueue);
router.get("/queue/status", syncController.getQueueStatus);

export default router;

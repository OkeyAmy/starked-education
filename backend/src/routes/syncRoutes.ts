import { Router } from "express";
import * as syncController from "../controllers/syncController";

const router: Router = Router();

// Device registration and management
router.post("/devices/register", syncController.registerDevice);
router.post("/devices/heartbeat", syncController.heartbeat);
router.delete("/devices/:deviceId", syncController.unregisterDevice);
router.get("/users/:userId/devices", syncController.getDevices);

// Sync status tracking
router.get("/users/:userId/status", syncController.getSyncStatus);

// Entity sync (real-time sync when change is detected)
router.post("/sync", syncController.syncEntity);

// Offline queue
router.post("/queue", syncController.enqueueSync);
router.post("/queue/process", syncController.processQueue);
router.get("/queue/status", syncController.getQueueStatus);

export default router;

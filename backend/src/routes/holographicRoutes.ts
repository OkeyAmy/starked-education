import express, { Router } from "express";
import * as holographicController from "../controllers/holographicController";
import { validateRequestSchema } from "../middleware/validateRequestSchema";
import { encodeContentSchema, decodeContentSchema, parallelAccessSchema, optimizeStorageSchema } from "../middleware/validation";

const router: Router = express.Router();

router.post("/encode", validateRequestSchema(encodeContentSchema), holographicController.encodeContent);
router.get("/decode/:hash", validateRequestSchema(decodeContentSchema), holographicController.decodeContent);
router.post("/access/parallel", validateRequestSchema(parallelAccessSchema), holographicController.parallelAccess);
router.get("/metrics", holographicController.getMetrics);
router.post("/optimize", validateRequestSchema(optimizeStorageSchema), holographicController.optimizeStorage);

export default router;

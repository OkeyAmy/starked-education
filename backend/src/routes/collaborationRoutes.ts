import express from 'express';
import { CollaborationRoomController } from '../controllers/collaborationRoomController';
import { validateRequestSchema } from '../middleware/validateRequestSchema';
import { createRoomSchema, listRoomsSchema, getRoomByIdSchema, endRoomSchema } from '../middleware/validation';

const router = express.Router();

// Room management routes
router.post('/rooms', validateRequestSchema(createRoomSchema), CollaborationRoomController.createRoom);
router.get('/rooms', validateRequestSchema(listRoomsSchema), CollaborationRoomController.listRooms);
router.get('/rooms/:roomId', validateRequestSchema(getRoomByIdSchema), CollaborationRoomController.getRoomById);
router.post('/rooms/:roomId/end', validateRequestSchema(endRoomSchema), CollaborationRoomController.endRoom);

export default router;

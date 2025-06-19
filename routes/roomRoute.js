
// routes/roomRoute.js
import express from 'express';
import {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  deleteRoomImage,
  getAvailableRoomsBySession
} from '../controllers/roomController.js';
import { verifyAdmin } from '../middleware/adminMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Room routes are working!'
  });
});

// PUBLIC ROUTES (for users to view rooms)
router.get('/', getAllRooms);                          // Get all rooms with filtering
router.get('/available', getAvailableRoomsBySession);  // Get rooms available for specific date/session
router.get('/:id', getRoomById);                       // Get specific room details

// ADMIN ONLY ROUTES (for room management)
router.post('/', protect, verifyAdmin, upload.array('images', 5), createRoom);           // Create room with images
router.put('/:id', protect, verifyAdmin, upload.array('images', 5), updateRoom);         // Update room with images
router.delete('/:id', protect, verifyAdmin, deleteRoom);                                 // Delete room
router.delete('/:roomId/images/:imageId', protect, verifyAdmin, deleteRoomImage);        // Delete room image

export default router;
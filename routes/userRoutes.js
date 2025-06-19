// routes/userRoutes.js

import express from 'express';
const router = express.Router();

import { getUserProfile } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

router.get('/me', protect, getUserProfile);

export default router;

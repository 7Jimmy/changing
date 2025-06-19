

import express from 'express';
const router = express.Router();

import {
  inviteUser,
  getAllUsers,
  editUser,
  deleteUser
} from '../controllers/adminController.js';

import { verifyAdmin } from '../middleware/adminMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';

router.post('/invite', inviteUser);
router.get('/users',  getAllUsers);
router.put('/users/:id',  editUser);
router.delete('/users/:id', deleteUser);

export default router;

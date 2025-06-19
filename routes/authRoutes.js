

import express from'express'
const router = express.Router();
import { loginUser, registerUser, forgotPassword, resetPassword,logoutUser } from '../controllers/authController.js'

router.post('/login', loginUser);
router.post('/register/:token', registerUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/logout', logoutUser);

export default router;
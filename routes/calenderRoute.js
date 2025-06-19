


import express from 'express';
import {
  createCalendarEntry,
  getCalendarByDate,
  bookSeats,
  cancelBooking,
  getUserBookings
} from '../controllers/calenderController.js';
import { protect } from '../middleware/authMiddleware.js';
import { verifyAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Calendar routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Public routes
router.get('/', getCalendarByDate);                  // Get calendar entries by date

// Protected routes for all users
router.post('/:calendarId/book', protect, bookSeats);                         // Book seats
router.delete('/:calendarId/bookings/:bookingId', protect, cancelBooking);    // Cancel booking
router.get('/user/:userId/bookings', protect, getUserBookings);               // Get user bookings

// Admin routes
router.post('/', protect, verifyAdmin, createCalendarEntry);                  // Create calendar entry

export default router;
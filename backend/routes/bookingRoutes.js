// backend/routes/bookingRoutes.js

import express from 'express';

import * as bookingController from '../controllers/bookingController.js';

import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all booking routes
router.use(authenticate);

// Create booking
router.post(
    '/',
    bookingController.createBooking
);

// Verify Razorpay payment
router.post(
    '/verify-payment',
    bookingController.verifyPayment
);

// Get logged-in user's bookings
router.get(
    '/my-bookings',
    bookingController.getMyBookings
);

// Recurring Charging Schedules
router.post(
    '/recurring',
    bookingController.createRecurringSchedule
);

router.get(
    '/recurring',
    bookingController.getRecurringSchedules
);

router.delete(
    '/recurring/:id',
    bookingController.deleteRecurringSchedule
);

// Next upcoming charging calculation
router.get(
    '/next-scheduled',
    bookingController.getNextScheduledCharging
);

// Update booking status
router.put(
    '/:id',
    bookingController.updateBooking
);

export default router;
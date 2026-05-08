const express = require('express');
const {
  createBooking,
  confirmPayment,
  getMyBookings,
  getBooking,
  cancelBooking,
  checkInAttendee,
  getEventBookings
} = require('../controllers/bookingController');
const { authenticate, authorize, checkEventAccess } = require('../middleware/authMiddleware');
const {
  createBookingValidation,
  confirmPaymentValidation,
  cancelBookingValidation,
  checkInValidation
} = require('../validations/bookingValidation');

const router = express.Router();

// User booking routes
router.post(
  '/',
  authenticate,
  createBookingValidation,
  createBooking
);

router.post(
  '/:id/confirm-payment',
  authenticate,
  confirmPaymentValidation,
  confirmPayment
);

router.get(
  '/my-bookings',
  authenticate,
  getMyBookings
);

router.get(
  '/:id',
  authenticate,
  getBooking
);

router.put(
  '/:id/cancel',
  authenticate,
  cancelBookingValidation,
  cancelBooking
);

// Organizer/Admin routes
router.get(
  '/event/:eventId',
  authenticate,
  checkEventAccess,
  getEventBookings
);

router.post(
  '/:id/check-in',
  authenticate,
  authorize('organizer', 'admin'),
  checkInValidation,
  checkInAttendee
);

module.exports = router;

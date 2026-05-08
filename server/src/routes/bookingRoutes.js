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
const { bookingLimiter } = require('../middleware/securityMiddleware');
const {
  validate,
  validateObjectId,
  validatePagination,
  validateDateRange
} = require('../middleware/validationMiddleware');
const {
  createBookingValidation,
  confirmPaymentValidation,
  cancelBookingValidation,
  checkInValidation
} = require('../validations/bookingValidation');

const router = express.Router();

// Enhanced validation for booking creation
const enhancedBookingValidation = [
  ...createBookingValidation,
  (req, res, next) => {
    const { eventId, quantity } = req.body;
    
    // Validate event ID
    if (eventId && !validateObjectId(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }
    
    // Validate quantity
    if (quantity && (quantity < 1 || quantity > 10)) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be between 1 and 10'
      });
    }
    
    next();
  }
];

// User booking routes
router.post(
  '/',
  authenticate,
  bookingLimiter,
  enhancedBookingValidation,
  validate,
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

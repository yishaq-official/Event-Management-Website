const express = require('express');
const {
  getEvents,
  getEvent,
  getFeaturedEvents,
  getUpcomingEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  updateEventStatus,
  getEventAnalytics
} = require('../controllers/eventController');
const { authenticate, authorize, checkEventAccess } = require('../middleware/authMiddleware');
const { generalLimiter } = require('../middleware/securityMiddleware');
const {
  validate,
  validateObjectId,
  validatePagination,
  validateSort,
  validateDateRange
} = require('../middleware/validationMiddleware');
const {
  createEventValidation,
  updateEventValidation,
  updateEventStatusValidation
} = require('../validations/eventValidation');

const router = express.Router();

// Enhanced validation for public routes with rate limiting
router.get('/', generalLimiter, validatePagination, validateSort, validateDateRange, getEvents);
router.get('/featured', generalLimiter, getFeaturedEvents);
router.get('/upcoming', generalLimiter, getUpcomingEvents);

// Enhanced validation for single event
router.get('/:id', (req, res, next) => {
  // Validate ObjectId parameter
  if (!validateObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid event ID format'
    });
  }
  next();
}, getEvent);

// Protected routes with enhanced validation
router.get('/my-events', authenticate, authorize('organizer', 'admin'), validatePagination, getMyEvents);

// Organizer/Admin routes with enhanced security
router.post(
  '/',
  authenticate,
  authorize('organizer', 'admin'),
  generalLimiter,
  createEventValidation,
  validate,
  createEvent
);

router.put(
  '/:id',
  authenticate,
  checkEventAccess,
  generalLimiter,
  updateEventValidation,
  validate,
  updateEvent
);

router.delete(
  '/:id',
  authenticate,
  checkEventAccess,
  generalLimiter,
  validate,
  deleteEvent
);

router.get(
  '/:id/analytics',
  authenticate,
  checkEventAccess,
  getEventAnalytics
);

// Admin only routes
router.put(
  '/:id/status',
  authenticate,
  authorize('admin'),
  updateEventStatusValidation,
  updateEventStatus
);

module.exports = router;

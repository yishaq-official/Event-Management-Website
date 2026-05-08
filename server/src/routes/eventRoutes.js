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
const {
  createEventValidation,
  updateEventValidation,
  updateEventStatusValidation
} = require('../validations/eventValidation');

const router = express.Router();

// Public routes
router.get('/', getEvents);
router.get('/featured', getFeaturedEvents);
router.get('/upcoming', getUpcomingEvents);
router.get('/:id', getEvent);

// Protected routes
router.get('/my-events', authenticate, authorize('organizer', 'admin'), getMyEvents);

// Organizer/Admin routes
router.post(
  '/',
  authenticate,
  authorize('organizer', 'admin'),
  createEventValidation,
  createEvent
);

router.put(
  '/:id',
  authenticate,
  checkEventAccess,
  updateEventValidation,
  updateEvent
);

router.delete(
  '/:id',
  authenticate,
  checkEventAccess,
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

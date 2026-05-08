const express = require('express');
const {
  getOverviewAnalytics,
  getRevenueAnalytics,
  getEventAnalytics,
  getAttendeeAnalytics,
  getCategoryAnalytics
} = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All analytics routes require authentication and organizer/admin role
router.use(authenticate);
router.use(authorize('organizer', 'admin'));

// Overview analytics
router.get('/overview', getOverviewAnalytics);

// Revenue analytics with date filtering
router.get('/revenue', getRevenueAnalytics);

// Event performance analytics
router.get('/events', getEventAnalytics);

// Attendee analytics
router.get('/attendees', getAttendeeAnalytics);

// Category analytics
router.get('/categories', getCategoryAnalytics);

module.exports = router;

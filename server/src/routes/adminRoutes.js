const express = require('express');
const {
  getOverviewStats,
  getUsers,
  updateUserStatus,
  getEvents,
  updateEventStatus,
  getBookings,
  getReviews,
  updateReviewStatus,
  getPlatformAnalytics
} = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { generalLimiter } = require('../middleware/securityMiddleware');

const router = express.Router();

// All admin routes require admin role
router.use(authenticate);
router.use(authorize('admin'));

// Overview and statistics
router.get('/overview', generalLimiter, getOverviewStats);

// User management
router.get('/users', generalLimiter, getUsers);
router.put('/users/:id/status', generalLimiter, updateUserStatus);

// Event management
router.get('/events', generalLimiter, getEvents);
router.put('/events/:id/status', generalLimiter, updateEventStatus);

// Booking management
router.get('/bookings', generalLimiter, getBookings);

// Review management
router.get('/reviews', generalLimiter, getReviews);
router.put('/reviews/:id/status', generalLimiter, updateReviewStatus);

// Platform analytics
router.get('/analytics', generalLimiter, getPlatformAnalytics);

module.exports = router;

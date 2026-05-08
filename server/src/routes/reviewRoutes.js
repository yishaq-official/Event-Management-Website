const express = require('express');
const {
  createReview,
  getEventReviews,
  getMyReviews,
  updateReview,
  deleteReview,
  markReviewHelpful,
  reportReview
} = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { generalLimiter } = require('../middleware/securityMiddleware');
const {
  validate,
  createReviewValidation,
  updateReviewValidation,
  reportReviewValidation
} = require('../validations/reviewValidation');

const router = express.Router();

// Public routes
router.get('/event/:eventId', generalLimiter, getEventReviews);

// Protected routes
router.get('/my-reviews', authenticate, generalLimiter, getMyReviews);

// Review creation (requires booking)
router.post(
  '/',
  authenticate,
  generalLimiter,
  createReviewValidation,
  validate,
  createReview
);

// Review management
router.put(
  '/:id',
  authenticate,
  generalLimiter,
  updateReviewValidation,
  validate,
  updateReview
);

router.delete(
  '/:id',
  authenticate,
  generalLimiter,
  deleteReview
);

// Review interactions
router.post(
  '/:id/helpful',
  generalLimiter,
  markReviewHelpful
);

router.post(
  '/:id/report',
  authenticate,
  generalLimiter,
  reportReviewValidation,
  validate,
  reportReview
);

// Admin routes for review moderation
router.get(
  '/admin/all',
  authenticate,
  authorize('admin'),
  generalLimiter,
  (req, res, next) => {
    // This would be handled by admin controller
    res.redirect('/api/admin/reviews');
  }
);

router.put(
  '/admin/:id/status',
  authenticate,
  authorize('admin'),
  generalLimiter,
  (req, res, next) => {
    // This would be handled by admin controller
    res.redirect(`/api/admin/reviews/${req.params.id}/status`);
  }
);

module.exports = router;

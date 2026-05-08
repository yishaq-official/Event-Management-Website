const Review = require('../models/Review');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const { validationResult } = require('express-validator');

// @desc    Create a review for an event
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { eventId, rating, comment, title } = req.body;
    const userId = req.user._id;

    // Check if user has booked the event
    const booking = await Booking.findOne({
      user: userId,
      event: eventId,
      bookingStatus: 'confirmed'
    });

    if (!booking) {
      return res.status(400).json({
        success: false,
        message: 'You can only review events you have attended'
      });
    }

    // Check if user has already reviewed this event
    const existingReview = await Review.findOne({
      user: userId,
      event: eventId
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this event'
      });
    }

    // Create review
    const review = await Review.create({
      user: userId,
      event: eventId,
      rating,
      comment,
      title,
      booking: booking._id,
      status: 'pending' // Reviews need moderation
    });

    // Update event average rating
    await updateEventRating(eventId);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully. It will be visible after moderation.',
      review
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating review'
    });
  }
};

// @desc    Get reviews for an event
// @route   GET /api/reviews/event/:eventId
// @access  Public
const getEventReviews = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { event: eventId, status: 'approved' };
    
    if (req.query.rating) {
      filter.rating = parseInt(req.query.rating);
    }

    const reviews = await Review.find(filter)
      .populate('user', 'name profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Review.countDocuments(filter);

    // Calculate rating distribution
    const ratingStats = await Review.aggregate([
      { $match: { event: eventId, status: 'approved' } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Build rating distribution object
    const ratingDistribution = {};
    for (let i = 1; i <= 5; i++) {
      const stat = ratingStats.find(s => s._id === i);
      ratingDistribution[i] = stat ? stat.count : 0;
    }

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      reviews,
      ratingDistribution,
      averageRating: await getEventAverageRating(eventId)
    });
  } catch (error) {
    console.error('Get event reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching reviews'
    });
  }
};

// @desc    Get user's reviews
// @route   GET /api/reviews/my-reviews
// @access  Private
const getMyReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };
    
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const reviews = await Review.find(filter)
      .populate('event', 'title banner')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Review.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      reviews
    });
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching reviews'
    });
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { rating, comment, title } = req.body;
    const reviewId = req.params.id;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns the review
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    // Update review
    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      {
        rating,
        comment,
        title,
        status: 'pending' // Re-moderate after update
      },
      { new: true, runValidators: true }
    );

    // Update event average rating
    await updateEventRating(review.event);

    res.status(200).json({
      success: true,
      message: 'Review updated successfully. It will be visible after moderation.',
      review: updatedReview
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating review'
    });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = async (req, res, next) => {
  try {
    const reviewId = req.params.id;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns the review
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    // Delete review
    await Review.findByIdAndDelete(reviewId);

    // Update event average rating
    await updateEventRating(review.event);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting review'
    });
  }
};

// @desc    Mark review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Public
const markReviewHelpful = async (req, res, next) => {
  try {
    const reviewId = req.params.id;
    const userId = req.user?._id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user has already marked this review
    const alreadyMarked = review.helpfulUsers && review.helpfulUsers.includes(userId);
    
    if (alreadyMarked) {
      return res.status(400).json({
        success: false,
        message: 'You have already marked this review as helpful'
      });
    }

    // Add user to helpful users
    await Review.findByIdAndUpdate(
      reviewId,
      {
        $push: { helpfulUsers: userId },
        $inc: { helpfulCount: 1 }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Review marked as helpful'
    });
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking review as helpful'
    });
  }
};

// @desc    Report a review
// @route   POST /api/reviews/:id/report
// @access  Private
const reportReview = async (req, res, next) => {
  try {
    const { reason, description } = req.body;
    const reviewId = req.params.id;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user has already reported this review
    const alreadyReported = review.reports && review.reports.some(report => 
      report.user.toString() === userId.toString()
    );
    
    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this review'
      });
    }

    // Add report
    await Review.findByIdAndUpdate(
      reviewId,
      {
        $push: {
          reports: {
            user: userId,
            reason,
            description,
            createdAt: new Date()
          }
        },
        $inc: { reportCount: 1 }
      }
    );

    // Auto-flag for moderation if multiple reports
    if (review.reportCount + 1 >= 3) {
      await Review.findByIdAndUpdate(reviewId, {
        status: 'flagged'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Review reported successfully'
    });
  } catch (error) {
    console.error('Report review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error reporting review'
    });
  }
};

// Helper function to update event average rating
const updateEventRating = async (eventId) => {
  try {
    const ratingStats = await Review.aggregate([
      { $match: { event: eventId, status: 'approved' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const stats = ratingStats[0];
    if (stats && stats.totalReviews > 0) {
      await Event.findByIdAndUpdate(eventId, {
        averageRating: Math.round(stats.averageRating * 10) / 10, // Round to 1 decimal
        totalReviews: stats.totalReviews
      });
    } else {
      await Event.findByIdAndUpdate(eventId, {
        averageRating: 0,
        totalReviews: 0
      });
    }
  } catch (error) {
    console.error('Update event rating error:', error);
  }
};

// Helper function to get event average rating
const getEventAverageRating = async (eventId) => {
  try {
    const ratingStats = await Review.aggregate([
      { $match: { event: eventId, status: 'approved' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' }
        }
      }
    ]);

    return ratingStats[0] ? ratingStats[0].averageRating : 0;
  } catch (error) {
    console.error('Get average rating error:', error);
    return 0;
  }
};

module.exports = {
  createReview,
  getEventReviews,
  getMyReviews,
  updateReview,
  deleteReview,
  markReviewHelpful,
  reportReview
};

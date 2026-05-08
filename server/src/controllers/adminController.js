const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Payment = require('../models/Payment');

// @desc    Get admin overview statistics
// @route   GET /api/admin/overview
// @access  Private (Admin only)
const getOverviewStats = async (req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // User statistics
    const totalUsers = await User.countDocuments();
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: thisMonthStart }
    });
    const newUsersLastMonth = await User.countDocuments({
      createdAt: { $gte: lastMonthStart, $lt: thisMonthStart }
    });

    // Event statistics
    const totalEvents = await Event.countDocuments();
    const eventsThisMonth = await Event.countDocuments({
      createdAt: { $gte: thisMonthStart }
    });
    const eventsLastMonth = await Event.countDocuments({
      createdAt: { $gte: lastMonthStart, $lt: thisMonthStart }
    });

    // Booking statistics
    const totalBookings = await Booking.countDocuments();
    const bookingsThisMonth = await Booking.countDocuments({
      createdAt: { $gte: thisMonthStart }
    });
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Review statistics
    const totalReviews = await Review.countDocuments();
    const pendingReviews = await Review.countDocuments({ status: 'pending' });

    const stats = {
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
        newLastMonth: newUsersLastMonth,
        growth: lastMonthStart === 0 ? 0 : ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth * 100).toFixed(1)
      },
      events: {
        total: totalEvents,
        thisMonth: eventsThisMonth,
        lastMonth: eventsLastMonth,
        growth: eventsLastMonth === 0 ? 0 : ((eventsThisMonth - eventsLastMonth) / eventsLastMonth * 100).toFixed(1)
      },
      bookings: {
        total: totalBookings,
        thisMonth: bookingsThisMonth,
        revenue: totalRevenue[0]?.total || 0
      },
      reviews: {
        total: totalReviews,
        pending: pendingReviews,
        averageRating: await Review.aggregate([
          { $group: { _id: null, averageRating: { $avg: '$rating' } } }
        ])
      }
    };

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Admin overview stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching admin statistics'
    });
  }
};

// @desc    Get all users with pagination and filtering
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    if (req.query.role) {
      filter.role = req.query.role;
    }

    if (req.query.status) {
      filter.isActive = req.query.status === 'active';
    }

    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
};

// @desc    Update user status (activate/suspend)
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin only)
const updateUserStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const userId = req.params.id;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active or suspended'
      });
    }

    const existingUser = await User.findById(userId);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isActive: status === 'active',
        suspensionReason: status === 'suspended' ? reason : undefined,
        suspendedAt: status === 'suspended' ? new Date() : undefined,
        reactivatedAt: status === 'active' && existingUser.suspendedAt ? new Date() : undefined
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: `User ${status} successfully`,
      user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user status'
    });
  }
};

// @desc    Get all events with admin filtering
// @route   GET /api/admin/events
// @access  Private (Admin only)
const getEvents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.organizer) {
      filter.organizer = req.query.organizer;
    }

    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) {
        filter.date.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.date.$lte = new Date(req.query.endDate);
      }
    }

    const events = await Event.find(filter)
      .populate('organizer', 'name profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Event.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      events
    });
  } catch (error) {
    console.error('Get admin events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching events'
    });
  }
};

// @desc    Update event status (approve/reject)
// @route   PUT /api/admin/events/:id/status
// @access  Private (Admin only)
const updateEventStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    const eventId = req.params.id;

    if (!['approved', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved, rejected, or cancelled'
      });
    }

    const event = await Event.findByIdAndUpdate(
      eventId,
      {
        status,
        approvalStatus: {
          approvedBy: req.user._id,
          approvedAt: new Date(),
          rejectionReason: status === 'rejected' ? rejectionReason : undefined
        }
      },
      { new: true, runValidators: true }
    ).populate('organizer', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Send notification to organizer
    const Notification = require('../models/Notification');
    await Notification.create({
      recipient: event.organizer._id,
      type: status === 'approved' ? 'event_approved' : 'event_rejected',
      title: `Event ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      message: `Your event "${event.title}" has been ${status}${status === 'rejected' ? ` with reason: ${rejectionReason}` : ''}`,
      metadata: {
        eventId: event._id,
        status
      }
    });

    res.status(200).json({
      success: true,
      message: `Event ${status} successfully`,
      event
    });
  } catch (error) {
    console.error('Update event status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating event status'
    });
  }
};

// @desc    Get all bookings with admin filtering
// @route   GET /api/admin/bookings
// @access  Private (Admin only)
const getBookings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    
    if (req.query.search) {
      filter.$or = [
        { 'user.name': { $regex: req.query.search, $options: 'i' } },
        { 'user.email': { $regex: req.query.search, $options: 'i' } },
        { 'event.title': { $regex: req.query.search, $options: 'i' } }
      ];
    }

    if (req.query.status) {
      filter.bookingStatus = req.query.status;
    }

    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    const bookings = await Booking.find(filter)
      .populate('user', 'name email')
      .populate('event', 'title date startDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      bookings
    });
  } catch (error) {
    console.error('Get admin bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching bookings'
    });
  }
};

// @desc    Get all reviews with admin filtering
// @route   GET /api/admin/reviews
// @access  Private (Admin only)
const getReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    
    if (req.query.search) {
      filter.$or = [
        { 'user.name': { $regex: req.query.search, $options: 'i' } },
        { 'event.title': { $regex: req.query.search, $options: 'i' } },
        { comment: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.rating) {
      filter.rating = parseInt(req.query.rating);
    }

    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    const reviews = await Review.find(filter)
      .populate('user', 'name email')
      .populate('event', 'title')
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
    console.error('Get admin reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching reviews'
    });
  }
};

// @desc    Update review status (approve/reject)
// @route   PUT /api/admin/reviews/:id/status
// @access  Private (Admin only)
const updateReviewStatus = async (req, res, next) => {
  try {
    const { status, moderationNote } = req.body;
    const reviewId = req.params.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved or rejected'
      });
    }

    const review = await Review.findByIdAndUpdate(
      reviewId,
      {
        status,
        moderationNote,
        moderatedBy: req.user._id,
        moderatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('user event', 'title');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Review ${status} successfully`,
      review
    });
  } catch (error) {
    console.error('Update review status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating review status'
    });
  }
};

// @desc    Get platform analytics
// @route   GET /api/admin/analytics
// @access  Private (Admin only)
const getPlatformAnalytics = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    
    // Date range for analytics
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const endDate = now;

    // User analytics
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Event analytics
    const eventStats = await Event.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 },
          categories: { $addToSet: '$category' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Booking analytics
    const bookingStats = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Revenue analytics
    const revenueStats = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const analytics = {
      userGrowth: userGrowth,
      eventStats: eventStats,
      bookingStats: bookingStats,
      revenueStats: revenueStats
    };

    res.status(200).json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Platform analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching platform analytics'
    });
  }
};

module.exports = {
  getOverviewStats,
  getUsers,
  updateUserStatus,
  getEvents,
  updateEventStatus,
  getBookings,
  getReviews,
  updateReviewStatus,
  getPlatformAnalytics
};

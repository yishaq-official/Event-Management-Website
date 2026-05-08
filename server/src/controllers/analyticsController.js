const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const User = require('../models/User');

// @desc    Get overview analytics for organizer
// @route   GET /api/analytics/overview
// @access  Private (Organizer/Admin)
const getOverviewAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    // Date ranges for comparison
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Build base filter
    const baseFilter = isAdmin ? {} : { organizer: userId };

    // Total events
    const totalEvents = await Event.countDocuments(baseFilter);

    // Events change (last 30 days vs previous 30 days)
    const currentPeriodEvents = await Event.countDocuments({
      ...baseFilter,
      createdAt: { $gte: thirtyDaysAgo }
    });

    const previousPeriodEvents = await Event.countDocuments({
      ...baseFilter,
      createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
    });

    const eventsChange = previousPeriodEvents === 0 
      ? 100 
      : ((currentPeriodEvents - previousPeriodEvents) / previousPeriodEvents) * 100;

    // Total attendees
    const attendeesAggregation = await Booking.aggregate([
      { $match: { ...baseFilter, bookingStatus: 'confirmed' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$tickets.quantity' }
        }
      }
    ]);

    const totalAttendees = attendeesAggregation[0]?.total || 0;

    // Attendees change (this month vs last month)
    const thisMonthAttendees = await Booking.aggregate([
      {
        $match: {
          ...baseFilter,
          bookingStatus: 'confirmed',
          createdAt: { $gte: thisMonthStart }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$tickets.quantity' }
        }
      }
    ]);

    const lastMonthAttendees = await Booking.aggregate([
      {
        $match: {
          ...baseFilter,
          bookingStatus: 'confirmed',
          createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$tickets.quantity' }
        }
      }
    ]);

    const attendeesChange = (lastMonthAttendees[0]?.total || 0) === 0
      ? 100
      : ((thisMonthAttendees[0]?.total || 0) - (lastMonthAttendees[0]?.total || 0)) / (lastMonthAttendees[0]?.total || 0) * 100;

    // Total revenue
    const revenueAggregation = await Payment.aggregate([
      { $match: { ...baseFilter, status: 'completed' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const totalRevenue = revenueAggregation[0]?.total || 0;

    // Revenue change (this month vs last month)
    const thisMonthRevenue = await Payment.aggregate([
      {
        $match: {
          ...baseFilter,
          status: 'completed',
          createdAt: { $gte: thisMonthStart }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const lastMonthRevenue = await Payment.aggregate([
      {
        $match: {
          ...baseFilter,
          status: 'completed',
          createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const revenueChange = (lastMonthRevenue[0]?.total || 0) === 0
      ? 100
      : ((thisMonthRevenue[0]?.total || 0) - (lastMonthRevenue[0]?.total || 0)) / (lastMonthRevenue[0]?.total || 0) * 100;

    // Average rating
    const ratingAggregation = await Review.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          total: { $sum: 1 }
        }
      }
    ]);

    const averageRating = ratingAggregation[0]?.averageRating || 0;

    // Rating change (last 30 days vs previous 30 days)
    const currentPeriodRatings = await Review.countDocuments({
      ...baseFilter,
      createdAt: { $gte: thirtyDaysAgo }
    });

    const previousPeriodRatings = await Review.countDocuments({
      ...baseFilter,
      createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
    });

    const ratingChange = previousPeriodRatings === 0
      ? 100
      : ((currentPeriodRatings - previousPeriodRatings) / previousPeriodRatings) * 100;

    res.status(200).json({
      success: true,
      analytics: {
        totalEvents,
        eventsChange: Math.round(eventsChange),
        eventsChangeType: eventsChange >= 0 ? 'positive' : 'negative',
        totalAttendees,
        attendeesChange: Math.round(attendeesChange),
        attendeesChangeType: attendeesChange >= 0 ? 'positive' : 'negative',
        totalRevenue,
        revenueChange: Math.round(revenueChange),
        revenueChangeType: revenueChange >= 0 ? 'positive' : 'negative',
        averageRating,
        ratingChange: Math.round(ratingChange),
        ratingChangeType: ratingChange >= 0 ? 'positive' : 'negative'
      }
    });
  } catch (error) {
    console.error('Overview analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching overview analytics'
    });
  }
};

// @desc    Get revenue analytics with date range
// @route   GET /api/analytics/revenue
// @access  Private (Organizer/Admin)
const getRevenueAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    const { startDate, endDate, period = 'month' } = req.query;

    // Build base filter
    const baseFilter = isAdmin ? {} : { organizer: userId };

    // Date filtering
    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    // Group by period
    let groupFormat;
    switch (period) {
      case 'day':
        groupFormat = {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt'
          }
        };
        break;
      case 'week':
        groupFormat = {
          $dateToString: {
            format: '%Y-%U',
            date: '$createdAt'
          }
        };
        break;
      case 'month':
      default:
        groupFormat = {
          $dateToString: {
            format: '%Y-%m',
            date: '$createdAt'
          }
        };
        break;
      case 'year':
        groupFormat = {
          $dateToString: {
            format: '%Y',
            date: '$createdAt'
          }
        };
        break;
    }

    const revenueData = await Payment.aggregate([
      {
        $match: {
          ...baseFilter,
          status: 'completed',
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
        }
      },
      {
        $group: {
          _id: groupFormat,
          revenue: { $sum: '$amount' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: revenueData
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching revenue analytics'
    });
  }
};

// @desc    Get event performance analytics
// @route   GET /api/analytics/events
// @access  Private (Organizer/Admin)
const getEventAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    const { limit = 10 } = req.query;

    // Build base filter
    const baseFilter = isAdmin ? {} : { organizer: userId };

    const eventPerformance = await Event.aggregate([
      { $match: baseFilter },
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'event',
          as: 'bookings'
        }
      },
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'event',
          as: 'reviews'
        }
      },
      {
        $lookup: {
          from: 'payments',
          localField: '_id',
          foreignField: 'event',
          as: 'payments'
        }
      },
      {
        $addFields: {
          totalBookings: { $size: '$bookings' },
          confirmedBookings: {
            $size: {
              $filter: {
                input: '$bookings',
                cond: { $eq: ['$$this.bookingStatus', 'confirmed'] }
              }
            }
          },
          totalRevenue: {
            $sum: {
              $map: {
                input: '$payments',
                as: 'payment',
                in: {
                  $cond: {
                    if: { $eq: ['$$payment.status', 'completed'] },
                    then: ['$$payment.amount'],
                    else: []
                  }
                }
              }
            }
          },
          averageRating: {
            $avg: {
              $map: {
                input: '$reviews',
                as: 'review',
                in: {
                  $cond: {
                    if: { $eq: ['$$review.status', 'approved'] },
                    then: ['$$review.rating'],
                    else: []
                  }
                }
              }
            }
          },
          totalReviews: {
            $size: {
              $filter: {
                input: '$reviews',
                cond: { $eq: ['$$this.status', 'approved'] }
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          banner: 1,
          date: 1,
          category: 1,
          status: 1,
          capacity: 1,
          currentAttendees: 1,
          totalBookings: 1,
          confirmedBookings: 1,
          totalRevenue: { $ifNull: ['$totalRevenue', 0] },
          averageRating: { $ifNull: ['$averageRating', 0] },
          totalReviews: { $ifNull: ['$totalReviews', 0] }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.status(200).json({
      success: true,
      data: eventPerformance
    });
  } catch (error) {
    console.error('Event analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching event analytics'
    });
  }
};

// @desc    Get attendee analytics
// @route   GET /api/analytics/attendees
// @access  Private (Organizer/Admin)
const getAttendeeAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    const { startDate, endDate } = req.query;

    // Build base filter
    const baseFilter = isAdmin ? {} : { organizer: userId };

    // Date filtering
    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    const attendeeData = await Booking.aggregate([
      {
        $match: {
          ...baseFilter,
          bookingStatus: 'confirmed',
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
        }
      },
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      { $unwind: '$tickets' },
      {
        $group: {
          _id: {
            event: '$event._id',
            title: '$event.title',
            date: '$event.date.startDate'
          },
          attendees: { $sum: '$tickets.quantity' },
          revenue: { $sum: '$tickets.price' }
        }
      },
      { $sort: { '_id.date': -1 } }
    ]);

    // Group by date for trend analysis
    const dailyTrends = await Booking.aggregate([
      {
        $match: {
          ...baseFilter,
          bookingStatus: 'confirmed',
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
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
          attendees: { $sum: '$tickets.quantity' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: attendeeData,
        trends: dailyTrends
      }
    });
  } catch (error) {
    console.error('Attendee analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching attendee analytics'
    });
  }
};

// @desc    Get category analytics
// @route   GET /api/analytics/categories
// @access  Private (Organizer/Admin)
const getCategoryAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    // Build base filter
    const baseFilter = isAdmin ? {} : { organizer: userId };

    const categoryData = await Event.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalAttendees: { $sum: '$currentAttendees' },
          totalRevenue: {
            $sum: '$analytics.revenue'
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: categoryData
    });
  } catch (error) {
    console.error('Category analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching category analytics'
    });
  }
};

module.exports = {
  getOverviewAnalytics,
  getRevenueAnalytics,
  getEventAnalytics,
  getAttendeeAnalytics,
  getCategoryAnalytics
};
